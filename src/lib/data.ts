// Client-safe types, helpers and static shop settings.
// Categories, products and hero slides live in the database (see src/lib/queries.ts).

export type Category = {
  id: number;
  slug: string;
  name: string;
  /** product cutout shown on the homepage banner */
  image: string | null;
  parentId: number | null;
};

export type CategoryNode = Category & { children: Category[] };

export type Product = {
  id: number;
  slug: string;
  name: string;
  /** main image (first of images) */
  image: string;
  images: string[];
  price: number;
  oldPrice: number | null;
  /** delivery price inside Tbilisi / outside Tbilisi, ₾ (0 = free) */
  deliveryTbilisi: number;
  deliveryRegions: number;
  categoryId: number | null;
  /** slug of the product's own category (may be a subcategory) */
  categorySlug: string | null;
  /** slug of the top-level category */
  rootSlug: string | null;
  description: string;
  specs: [string, string][];
  stock: number;
};

export type Slide = {
  id: number;
  /** photo; a video slide may have none */
  image: string | null;
  /** optional background video; `image` is its poster */
  video?: string | null;
  align: "left" | "center" | "right";
  position: string;
  shade: "none" | "left" | "right";
  titleLines: { text: string; offer?: string }[];
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
};

export type NavItem = {
  label: string;
  href: string;
  dropdown?: { label: string; href: string }[];
};

export const categoryHref = (slug: string) => `/catalog?category=${slug}`;
export const productHref = (p: Pick<Product, "slug">) => `/product/${p.slug}`;
/** key used by the cart / wishlist in the browser */
export const productKey = (p: Pick<Product, "id">) => String(p.id);

export const buildNav = (top: Category[]): NavItem[] => [
  { label: "მთავარი", href: "/" },
  { label: "კატალოგი", href: "/catalog", dropdown: top.map((c) => ({ label: c.name, href: categoryHref(c.slug) })) },
  { label: "კონტაქტი", href: "/contact" },
];

// Static shop copy. Contact details and social links are edited in the admin
// (site_settings table, see getSiteSettings in src/lib/queries.ts).
export const siteInfo = {
  copyright: "© 2026 SportHub. ყველა უფლება დაცულია.",
  about: "სარბენი ბილიკები, სავარჯიშო ველოსიპედები, სავარჯიშო თხილამურები და მძიმე წონები სახლისა და დარბაზისთვის.",
};

export type SiteSettings = {
  /** first number is the main one (call buttons, checkout) */
  phones: string[];
  addresses: string[];
  email: string;
  hours: string;
  facebook: string;
  instagram: string;
  tiktok: string;
};

/** used until the admin saves the settings for the first time */
export const defaultSiteSettings: SiteSettings = {
  phones: ["577 44 0110"],
  addresses: ["საქართველო, ქალაქი თბილისი, ორხევის მიმდებარე ტერიტორია"],
  email: "sporthub2027@gmail.com",
  hours: "ორშ-შაბ: 10:00-20:00",
  facebook: "",
  instagram: "",
  tiktok: "",
};

/** The shop's legal documents: footer "information" column and the tabs above each document. */
export const legalPages = [
  { href: "/terms", label: "წესები და პირობები" },
  { href: "/delivery", label: "მიწოდების პოლიტიკა" },
  { href: "/privacy", label: "კონფიდენციალურობის პოლიტიკა" },
] as const;

/** tel: link; a Georgian mobile written without the country code (5XX XX XX XX) gets +995 */
export const telHref = (phone: string) => {
  const n = phone.replace(/[^\d+]/g, "");
  return `tel:${/^5\d{8}$/.test(n) ? `+995${n}` : n}`;
};

// "Why shop with us" benefits, worded after the terms and the delivery policy
export const benefits = [
  { icon: "truck", title: "მიწოდება", text: "თბილისსა და შემოგარენში, შეკვეთის დამუშავებიდან 2-3 სამუშაო დღეში." },
  { icon: "shield", title: "1 წლიანი გარანტია", text: "ტრენაჟორებზე 1 წლიანი გარანტია." },
  { icon: "card", title: "გადახდა", text: "ნაღდი ანგარიშსწორებით კურიერთან ან საბანკო გადარიცხვით." },
  { icon: "return", title: "დაბრუნება 14 დღეში", text: "მიღებიდან 14 კალენდარული დღის განმავლობაში, მიზეზის მითითების გარეშე." },
] as const;

const priceFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
export const formatPrice = (n: number) => `${priceFormat.format(n).replace(/,/g, " ")} ₾`;

/** Search words of a query: lower case, split on spaces. */
export const searchTerms = (q: string) => q.toLowerCase().split(/\s+/).filter(Boolean);

/** A product matches when every word of the query appears in its name (any order, any part of a word). */
export const matchesSearch = (p: Pick<Product, "name">, terms: string[]) => {
  const name = p.name.toLowerCase();
  return terms.every((t) => name.includes(t));
};

export const discountPercent = (p: Pick<Product, "price" | "oldPrice">) =>
  p.oldPrice && p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;

/** Delivery zones of the delivery policy; each product has a price for each. */
export const deliveryZones = [
  { id: "tbilisi", label: "თბილისი", hint: "თბილისი და შემოგარენი" },
  { id: "regions", label: "თბილისის გარეთ", hint: "მიწოდება წინასწარ თანხმდება ტელეფონით" },
] as const;

export type DeliveryZone = (typeof deliveryZones)[number]["id"];

export const isDeliveryZone = (v: string): v is DeliveryZone => deliveryZones.some((z) => z.id === v);
export const zoneLabel = (z: DeliveryZone) => deliveryZones.find((x) => x.id === z)!.label;

/** delivery price for display: 0 is free */
export const shipText = (n: number) => (n === 0 ? "უფასო" : formatPrice(n));

type Deliverable = Pick<Product, "deliveryTbilisi" | "deliveryRegions">;

/**
 * Delivery of an order: the highest delivery price among its products for the zone
 * (everything travels together, so the largest item sets the price). Quantity does not change it.
 */
export const deliveryCost = (items: Deliverable[], zone: DeliveryZone) =>
  items.reduce((max, p) => Math.max(max, zone === "tbilisi" ? p.deliveryTbilisi : p.deliveryRegions), 0);

// payment methods of the terms and conditions
export const paymentMethods = [
  { id: "card", label: "ბარათით ონლაინ", hint: "საქართველოს ბანკის გადახდის გვერდზე" },
  { id: "cash", label: "ნაღდი ანგარიშსწორება", hint: "კურიერთან, საქონლის მიღებისას" },
  { id: "transfer", label: "საბანკო გადარიცხვა", hint: "რეკვიზიტებს გამოგიგზავნით" },
  { id: "installment", label: "განვადება TBC ბანკით", hint: "განაცხადი TBC ბანკის გვერდზე" },
] as const;

export type PaymentMethod = (typeof paymentMethods)[number]["id"];


/** promo discount on the products (delivery is not discounted), rounded to tetri */
export const promoDiscount = (subtotal: number, percent: number) => Math.round(subtotal * percent) / 100;

/** promo codes are stored and compared in upper case: letters, digits, "-" and "_" */
export const normalizePromo = (v: string) => v.trim().toUpperCase().replace(/\s+/g, "");
export const PROMO_RE = /^[A-Z0-9_-]{3,32}$/;

export const orderStatuses = [
  { id: "new", label: "ახალი" },
  { id: "confirmed", label: "დადასტურებული" },
  { id: "shipped", label: "გზაშია" },
  { id: "delivered", label: "მიწოდებული" },
  { id: "cancelled", label: "გაუქმებული" },
] as const;

/** card payment state (orders.payment_status) */
export const paymentStates: Record<string, string> = {
  pending: "მოლოდინში",
  awaiting: "ელოდება თქვენს დადასტურებას",
  paid: "გადახდილია",
  failed: "ვერ შესრულდა",
  refunded: "დაბრუნებულია",
};

/** label of a stored payment method (older orders may have "installment") */
export const paymentLabel = (id: string) =>
  paymentMethods.find((m) => m.id === id)?.label ?? id;
export const statusLabel = (id: string) => orderStatuses.find((s) => s.id === id)?.label ?? id;
