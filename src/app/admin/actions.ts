"use server";

import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { categories, db, heroSlides, media, orders, products, promoCodes, siteSettings, type OrderStatus } from "@/db";
import { checkCredentials, createSessionToken, requireAdmin, SESSION_COOKIE } from "@/lib/auth";
import { isBogPayment, normalizePromo, orderStatuses, PROMO_RE } from "@/lib/data";
import { credoEnabled } from "@/lib/credo";
import { TAGS } from "@/lib/queries";
import { slugify } from "@/lib/slug";
import { optimizeImage, releaseMedia, sweepOrphans } from "@/lib/media";
import { siteOrigin, syncBogPayment, syncCredo, syncFlittPayment, syncInstallment } from "@/lib/payments";
import { cancelInstallment, confirmInstallment } from "@/lib/tbc";
import { isImageUrl, isVideoUrl, newKey, presignPut, publicUrl, putObject, r2Enabled } from "@/lib/storage";

export type FormState = { ok?: boolean; error?: string; fields?: Record<string, string> } | null;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => {
  const v = str(f, k).replace(",", ".");
  return v === "" ? null : Number(v);
};

// 

const attempts = new Map<string, { n: number; until: number }>();

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const a = attempts.get(ip);
  if (a && a.n >= 5 && a.until > Date.now()) {
    return { error: "ძალიან ბევრი მცდელობა. სცადეთ 15 წუთში." };
  }
  if (!checkCredentials(str(form, "username"), String(form.get("password") ?? ""))) {
    const n = a && a.until > Date.now() ? a.n + 1 : 1;
    attempts.set(ip, { n, until: Date.now() + 15 * 60 * 1000 });
    return { error: "მომხმარებელი ან პაროლი არასწორია" };
  }
  attempts.delete(ip);
  const { token, expires } = createSessionToken();
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

// 

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
const MAX_IMAGE = 8 * 1024 * 1024;

export async function uploadImage(form: FormData): Promise<{ url?: string; error?: string }> {
  await requireAdmin();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "ფაილი ვერ მოიძებნა" };
  if (!IMAGE_TYPES.includes(file.type)) return { error: "დაშვებულია JPG, PNG, WEBP, AVIF ან GIF" };
  if (file.size > MAX_IMAGE) return { error: "ფაილი 8 MB-ზე დიდია" };
  const { data, mime } = await optimizeImage(Buffer.from(await file.arrayBuffer()), file.type);
  if (r2Enabled) {
    after(() => sweepOrphans());
    try {
      return { url: await putObject(new Uint8Array(data), mime) };
    } catch (e) {
      console.error(e);
      return { error: "ატვირთვა ვერ მოხერხდა, სცადეთ თავიდან" };
    }
  }
  const [row] = await db.insert(media).values({ mime, size: data.length, data }).returning({ id: media.id });
  return { url: `/media/${row.id}` };
}

const VIDEO_TYPES = ["video/mp4", "video/webm"];
const MAX_VIDEO = 50 * 1024 * 1024;

/**
 * Hero videos are too large to pass through a server action, so the browser uploads them
 * straight to R2 with a short-lived signed URL. Returns that URL and the file's public URL.
 */
export async function createVideoUpload(
  type: string,
  size: number,
): Promise<{ uploadUrl?: string; headers?: Record<string, string>; url?: string; error?: string }> {
  await requireAdmin();
  if (!r2Enabled) return { error: "ვიდეოს ატვირთვა ხელმისაწვდომია მხოლოდ R2 საცავით" };
  if (!VIDEO_TYPES.includes(type)) return { error: "დაშვებულია MP4 ან WebM" };
  if (!Number.isInteger(size) || size <= 0) return { error: "ფაილი ვერ მოიძებნა" };
  if (size > MAX_VIDEO) return { error: "ვიდეო 50 MB-ზე დიდია" };
  after(() => sweepOrphans());
  const key = newKey(type);
  const signed = await presignPut(key, type, size);
  return { uploadUrl: signed.url, headers: signed.headers, url: publicUrl(key) };
}

// 

async function uniqueSlug(table: typeof products | typeof categories, wanted: string, exceptId?: number) {
  const base = slugify(wanted) || "item";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const where = exceptId ? and(eq(table.slug, candidate), ne(table.id, exceptId)) : eq(table.slug, candidate);
    const [hit] = await db.select({ id: table.id }).from(table).where(where).limit(1);
    if (!hit) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export async function saveProduct(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = num(form, "id");
  const fields: Record<string, string> = {};

  const name = str(form, "name");
  const price = num(form, "price");
  const oldPrice = num(form, "oldPrice");
  const stock = num(form, "stock") ?? 0;
  const categoryId = num(form, "categoryId");
  const deliveryTbilisi = num(form, "deliveryTbilisi");
  const deliveryRegions = num(form, "deliveryRegions");

  let images: string[] = [];
  let specs: [string, string][] = [];
  try {
    images = (JSON.parse(str(form, "images") || "[]") as unknown[]).map(String).filter(isImageUrl);
    specs = (JSON.parse(str(form, "specs") || "[]") as unknown[])
      .filter((r): r is [string, string] => Array.isArray(r) && r.length === 2)
      .map(([k, v]) => [String(k).trim(), String(v).trim()] as [string, string])
      .filter(([k, v]) => k && v);
  } catch {
    return { error: "ფორმის მონაცემები დაზიანებულია, გადატვირთეთ გვერდი" };
  }

  if (name.length < 2) fields.name = "მიუთითეთ დასახელება";
  if (price === null || !Number.isFinite(price) || price <= 0) fields.price = "მიუთითეთ ფასი";
  if (oldPrice !== null && (!Number.isFinite(oldPrice) || oldPrice <= (price ?? 0)))
    fields.oldPrice = "ძველი ფასი ახალზე მეტი უნდა იყოს (ან დატოვეთ ცარიელი)";
  if (!Number.isInteger(stock) || stock < 0) fields.stock = "მარაგი არაუარყოფითი მთელი რიცხვია";
  if (!categoryId) fields.categoryId = "აირჩიეთ კატეგორია";
  const shipOk = (v: number | null) => v !== null && Number.isFinite(v) && v >= 0 && v <= 10000;
  if (!shipOk(deliveryTbilisi)) fields.deliveryTbilisi = "მიუთითეთ ფასი (0 = უფასო)";
  if (!shipOk(deliveryRegions)) fields.deliveryRegions = "მიუთითეთ ფასი (0 = უფასო)";
  if (Object.keys(fields).length) return { error: "შეასწორეთ მონიშნული ველები", fields };

  const slug = await uniqueSlug(products, str(form, "slug") || name, id ?? undefined);
  const values = {
    name,
    slug,
    description: str(form, "description"),
    price: price!,
    oldPrice,
    deliveryTbilisi: deliveryTbilisi!,
    deliveryRegions: deliveryRegions!,
    stock,
    categoryId,
    images,
    specs,
    active: form.get("active") === "on",
    updatedAt: new Date(),
  };

  let savedId = id;
  if (id) {
    const [old] = await db.select({ images: products.images }).from(products).where(eq(products.id, id)).limit(1);
    await db.update(products).set(values).where(eq(products.id, id));
    await releaseMedia((old?.images ?? []).filter((u) => !images.includes(u)));
  } else {
    // New products go to the top of the list (and of the catalog).
    const [{ min }] = await db.select({ min: sql<number>`coalesce(min(${products.sortOrder}), 1)` }).from(products);
    const [row] = await db.insert(products).values({ ...values, sortOrder: Number(min) - 1 }).returning({ id: products.id });
    savedId = row.id;
  }
  updateTag(TAGS.catalog);
  if (!id) redirect(`/admin/products/${savedId}?saved=1`);
  return { ok: true };
}

export async function deleteProduct(id: number) {
  await requireAdmin();
  const [old] = await db.delete(products).where(eq(products.id, id)).returning({ images: products.images });
  await releaseMedia(old?.images ?? []);
  updateTag(TAGS.catalog);
  redirect("/admin/products");
}

export async function setProductActive(id: number, active: boolean) {
  await requireAdmin();
  await db.update(products).set({ active, updatedAt: new Date() }).where(eq(products.id, id));
  updateTag(TAGS.catalog);
}

// 

/**
 * Saves a drag-and-drop order. `ids` may be a filtered subset of the products:
 * they are written back into the slots they already occupy, so products that
 * were not shown keep their places.
 */
export async function reorderProducts(ids: number[]) {
  await requireAdmin();
  const wanted = ids.map(Number).filter(Number.isInteger);
  const all = await db.select({ id: products.id }).from(products).orderBy(asc(products.sortOrder), asc(products.id));
  const set = new Set(wanted);
  if (set.size !== wanted.length || wanted.some((id) => !all.some((p) => p.id === id))) return;
  let k = 0;
  const order = all.map((p) => (set.has(p.id) ? wanted[k++] : p.id));
  await db.transaction(async (tx) => {
    for (const [i, id] of order.entries()) {
      await tx.update(products).set({ sortOrder: i }).where(eq(products.id, id));
    }
  });
  updateTag(TAGS.catalog);
}

export async function saveCategory(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = num(form, "id");
  const name = str(form, "name");
  const parentId = num(form, "parentId");
  const fields: Record<string, string> = {};
  if (name.length < 2) fields.name = "მიუთითეთ დასახელება";
  if (id && parentId === id) fields.parentId = "კატეგორია საკუთარი თავის ქვეკატეგორია ვერ იქნება";
  if (parentId) {
    const [parent] = await db.select().from(categories).where(eq(categories.id, parentId)).limit(1);
    if (!parent) fields.parentId = "მშობელი კატეგორია ვერ მოიძებნა";
    else if (parent.parentId) fields.parentId = "ქვეკატეგორიას ქვეკატეგორია ვერ ექნება";
  }
  if (id && parentId) {
    const [child] = await db.select({ id: categories.id }).from(categories).where(eq(categories.parentId, id)).limit(1);
    if (child) fields.parentId = "ამ კატეგორიას ქვეკატეგორიები აქვს, ის ვერ გახდება ქვეკატეგორია";
  }
  if (Object.keys(fields).length) return { error: "შეასწორეთ მონიშნული ველები", fields };

  const values = {
    name,
    slug: await uniqueSlug(categories, str(form, "slug") || name, id ?? undefined),
    parentId: parentId || null,
    image: str(form, "image") || null,
    active: form.get("active") === "on",
  };
  // Order is set by drag and drop. A new category, or one moved to another
  // parent, goes to the end of its group.
  const lastInGroup = async () => {
    const [{ max }] = await db
      .select({ max: sql<number>`coalesce(max(${categories.sortOrder}), -1)` })
      .from(categories)
      .where(values.parentId ? eq(categories.parentId, values.parentId) : isNull(categories.parentId));
    return Number(max) + 1;
  };
  if (id) {
    const [old] = await db
      .select({ parentId: categories.parentId, image: categories.image })
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    const moved = (old?.parentId ?? null) !== values.parentId;
    await db
      .update(categories)
      .set(moved ? { ...values, sortOrder: await lastInGroup() } : values)
      .where(eq(categories.id, id));
    if (old?.image !== values.image) await releaseMedia([old?.image]);
  } else {
    await db.insert(categories).values({ ...values, sortOrder: await lastInGroup() });
  }
  updateTag(TAGS.catalog);
  redirect("/admin/categories?saved=1");
}

/** Saves a drag-and-drop order of one group: main categories, or one parent's subcategories. */
export async function reorderCategories(parentId: number | null, ids: number[]) {
  await requireAdmin();
  const siblings = await db
    .select({ id: categories.id })
    .from(categories)
    .where(parentId ? eq(categories.parentId, parentId) : isNull(categories.parentId));
  const wanted = ids.map(Number);
  const known = new Set(siblings.map((c) => c.id));
  if (wanted.length !== known.size || new Set(wanted).size !== wanted.length || wanted.some((id) => !known.has(id))) {
    throw new Error("Category list is out of date");
  }
  await db.transaction(async (tx) => {
    for (const [i, id] of wanted.entries()) {
      await tx.update(categories).set({ sortOrder: i }).where(eq(categories.id, id));
    }
  });
  updateTag(TAGS.catalog);
}

export async function deleteCategory(id: number) {
  await requireAdmin();
  // subcategories move up to the top level, products become uncategorised
  await db.update(categories).set({ parentId: null }).where(eq(categories.parentId, id));
  const [old] = await db.delete(categories).where(eq(categories.id, id)).returning({ image: categories.image });
  await releaseMedia([old?.image]);
  updateTag(TAGS.catalog);
  redirect("/admin/categories");
}

// 

const MAX_EXTRA_LINES = 3;

export async function saveSlide(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = num(form, "id");
  const image = str(form, "image") || null;
  const video = str(form, "video") || null;
  const fields: Record<string, string> = {};
  // a slide needs a photo or a video (or both: the photo is then the video's poster)
  if (image && !isImageUrl(image)) fields.image = "ფოტო ვერ მოიძებნა, ატვირთეთ თავიდან";
  if (video && !isVideoUrl(video)) fields.video = "ვიდეო ვერ მოიძებნა, ატვირთეთ თავიდან";
  if (!image && !video) fields.image = "ატვირთეთ ფოტო ან ვიდეო";
  const line1 = str(form, "line1");
  const line2 = str(form, "line2");
  if (!line1) fields.line1 = "მიუთითეთ სათაური";
  if (Object.keys(fields).length) return { error: "შეასწორეთ მონიშნული ველები", fields };

  const offer = str(form, "offer");
  const extra = form
    .getAll("extra")
    .map((v) => String(v).trim())
    .filter(Boolean)
    .slice(0, MAX_EXTRA_LINES);
  const titleLines = [
    ...[line1, line2].filter(Boolean).map((text, i, arr) => (i === arr.length - 1 && offer ? { text, offer } : { text })),
    ...extra.map((text) => ({ text })),
  ];
  const pick = <T extends string>(v: string, allowed: readonly T[], d: T) => (allowed.includes(v as T) ? (v as T) : d);

  const values = {
    image,
    video,
    align: pick(str(form, "align"), ["left", "center", "right"] as const, "right"),
    position: str(form, "position") || "center center",
    shade: pick(str(form, "shade"), ["none", "left", "right"] as const, "none"),
    titleLines,
    primaryLabel: str(form, "primaryLabel"),
    primaryHref: str(form, "primaryHref") || "/catalog",
    secondaryLabel: str(form, "secondaryLabel"),
    secondaryHref: str(form, "secondaryHref") || "/catalog",
    active: form.get("active") === "on",
  };
  if (id) {
    const [old] = await db.select({ image: heroSlides.image, video: heroSlides.video }).from(heroSlides).where(eq(heroSlides.id, id)).limit(1);
    await db.update(heroSlides).set(values).where(eq(heroSlides.id, id));
    await releaseMedia([old?.image, old?.video].filter((u) => u !== image && u !== video));
  } else {
    const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${heroSlides.sortOrder}), -1)` }).from(heroSlides);
    await db.insert(heroSlides).values({ ...values, sortOrder: Number(max) + 1 });
  }
  updateTag(TAGS.hero);
  redirect("/admin/hero?saved=1");
}

export async function deleteSlide(id: number) {
  await requireAdmin();
  const [old] = await db.delete(heroSlides).where(eq(heroSlides.id, id)).returning({ image: heroSlides.image, video: heroSlides.video });
  await releaseMedia([old?.image, old?.video]);
  updateTag(TAGS.hero);
  redirect("/admin/hero");
}

export async function moveSlide(id: number, dir: -1 | 1) {
  await requireAdmin();
  const all = await db.select({ id: heroSlides.id }).from(heroSlides).orderBy(heroSlides.sortOrder, heroSlides.id);
  const i = all.findIndex((s) => s.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= all.length) return;
  [all[i], all[j]] = [all[j], all[i]];
  await Promise.all(all.map((s, k) => db.update(heroSlides).set({ sortOrder: k }).where(eq(heroSlides.id, s.id))));
  updateTag(TAGS.hero);
}

export async function setSlideActive(id: number, active: boolean) {
  await requireAdmin();
  await db.update(heroSlides).set({ active }).where(eq(heroSlides.id, id));
  updateTag(TAGS.hero);
}

// 

export async function setOrderStatus(id: number, status: OrderStatus) {
  await requireAdmin();
  if (!orderStatuses.some((s) => s.id === status)) return;
  await db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, id));
  updateTag("orders");
}

export async function saveOrderNote(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = num(form, "id");
  if (!id) return { error: "შეკვეთა ვერ მოიძებნა" };
  await db
    .update(orders)
    .set({ adminNote: str(form, "adminNote").slice(0, 2000), updatedAt: new Date() })
    .where(eq(orders.id, id));
  updateTag("orders");
  return { ok: true };
}

// 

const MAX_LIST = 5;

/** "facebook.com/x" -> "https://facebook.com/x"; null if it is not a web address */
function normalizeUrl(v: string): string | null {
  if (!v) return "";
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withProto);
    return u.hostname.includes(".") ? u.toString() : null;
  } catch {
    return null;
  }
}

export async function saveSettings(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const list = (k: string) =>
    [...new Set(form.getAll(k).map((v) => String(v).trim()).filter(Boolean))].slice(0, MAX_LIST);
  const phones = list("phones");
  const addresses = list("addresses");
  const email = str(form, "email");
  const fields: Record<string, string> = {};

  if (phones.length === 0) fields.phones = "მიუთითეთ მინიმუმ ერთი ნომერი";
  else if (phones.some((p) => p.replace(/\D/g, "").length < 6)) fields.phones = "ნომერი არასწორია";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fields.email = "ელფოსტა არასწორია";

  const social: Record<"facebook" | "instagram" | "tiktok", string> = { facebook: "", instagram: "", tiktok: "" };
  for (const k of ["facebook", "instagram", "tiktok"] as const) {
    const url = normalizeUrl(str(form, k));
    if (url === null) fields[k] = "ბმული არასწორია";
    else social[k] = url;
  }
  if (Object.keys(fields).length) return { error: "შეასწორეთ მონიშნული ველები", fields };

  const values = { phones, addresses, email, hours: str(form, "hours"), ...social, updatedAt: new Date() };
  await db
    .insert(siteSettings)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: siteSettings.id, set: values });
  updateTag(TAGS.settings);
  return { ok: true };
}

// 

export async function savePromo(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const fields: Record<string, string> = {};
  const code = normalizePromo(str(form, "code"));
  const percent = num(form, "percent");
  const single = str(form, "kind") !== "multi";
  const days = num(form, "days");
  const uses = single ? 1 : num(form, "uses");

  if (!PROMO_RE.test(code)) fields.code = "3-დან 32 სიმბოლომდე: ლათინური ასოები, ციფრები, - და _";
  if (percent === null || !Number.isInteger(percent) || percent < 1 || percent > 100) fields.percent = "მიუთითეთ 1-დან 100-მდე";
  if (days !== null && (!Number.isInteger(days) || days < 1 || days > 3650)) fields.days = "დღეების რაოდენობა 1-დან 3650-მდე";
  if (!single && uses !== null && (!Number.isInteger(uses) || uses < 1 || uses > 1_000_000)) fields.uses = "მიუთითეთ დადებითი მთელი რიცხვი";
  if (!fields.code) {
    const [hit] = await db.select({ id: promoCodes.id }).from(promoCodes).where(eq(promoCodes.code, code)).limit(1);
    if (hit) fields.code = "ასეთი კოდი უკვე არსებობს";
  }
  if (Object.keys(fields).length) return { error: "შეასწორეთ მონიშნული ველები", fields };

  await db.insert(promoCodes).values({
    code,
    percent: percent!,
    maxUses: uses,
    expiresAt: days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null,
  });
  redirect(`/admin/promo?created=${encodeURIComponent(code)}`);
}

export async function setPromoActive(id: number, active: boolean) {
  await requireAdmin();
  await db.update(promoCodes).set({ active }).where(eq(promoCodes.id, id));
}

export async function deletePromo(id: number) {
  await requireAdmin();
  await db.delete(promoCodes).where(eq(promoCodes.id, id));
  redirect("/admin/promo");
}

/** Online payment of an order: re-check with the bank, or confirm / cancel a TBC installment. */
export async function bankAction(id: number, what: "refresh" | "confirm" | "cancel"): Promise<{ message?: string; error?: string }> {
  await requireAdmin();
  const [o] = await db
    .select({ payment: orders.payment, bogOrderId: orders.bogOrderId, tbcSessionId: orders.tbcSessionId, flittOrderId: orders.flittOrderId })
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);
  if (!o) return { error: "შეკვეთა ვერ მოიძებნა" };
  const origin = siteOrigin(await headers());
  try {
    if (isBogPayment(o.payment) && o.bogOrderId) {
      await syncBogPayment(o.bogOrderId, origin);
    } else if (o.payment === "credo" && credoEnabled) {
      await syncCredo(id);
    } else if (o.payment === "split" && o.flittOrderId) {
      await syncFlittPayment(o.flittOrderId, origin);
    } else if (o.payment === "installment" && o.tbcSessionId) {
      if (what === "confirm") await confirmInstallment(o.tbcSessionId);
      if (what === "cancel") await cancelInstallment(o.tbcSessionId);
      await syncInstallment(id, origin);
    } else {
      return { error: "ამ შეკვეთას ონლაინ გადახდა არ აქვს" };
    }
  } catch (e) {
    console.error("bankAction", id, what, e);
    return { error: "ბანკმა მოთხოვნა ვერ შეასრულა. სცადეთ ცოტა ხანში." };
  }
  updateTag("orders");
  refresh();
  return { message: what === "confirm" ? "დადასტურებულია" : what === "cancel" ? "გაუქმებულია" : "განახლდა" };
}

