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
  image: string;
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
  phones: ["+995 550 50 40 76"],
  addresses: ["რუსთაველის გამზ. 12, თბილისი"],
  email: "info@sporthub.ge",
  hours: "ორშ-შაბ: 10:00-20:00",
  facebook: "",
  instagram: "",
  tiktok: "",
};

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

// "Why shop with us" benefits (test copy)
export const benefits = [
  { icon: "truck", title: "სწრაფი მიწოდება", text: "მიწოდება მთელ საქართველოში 1-3 სამუშაო დღეში." },
  { icon: "shield", title: "ოფიციალური გარანტია", text: "ტრენაჟორებზე 2 წლამდე გარანტია." },
  { icon: "card", title: "უსაფრთხო გადახდა", text: "ბარათით ან საბანკო გადარიცხვით." },
  { icon: "installment", title: "განვადება", text: "შესაძლებელია განვადებით შეძენა." },
] as const;

const priceFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
export const formatPrice = (n: number) => `${priceFormat.format(n).replace(/,/g, " ")} ₾`;

export const discountPercent = (p: Pick<Product, "price" | "oldPrice">) =>
  p.oldPrice && p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;

// Checkout settings (test values)
export const delivery = {
  freeFrom: 300, // ₾: free delivery from this subtotal
  price: 15, // ₾
  cities: ["თბილისი", "ბათუმი", "ქუთაისი", "რუსთავი", "ზუგდიდი", "გორი", "თელავი", "სხვა"],
};

export const paymentMethods = [
  { id: "cash", label: "ადგილზე გადახდა", hint: "ნაღდი ან ბარათი კურიერთან" },
  { id: "transfer", label: "საბანკო გადარიცხვა", hint: "რეკვიზიტებს გამოგიგზავნით" },
  { id: "installment", label: "განვადება", hint: "დაგიკავშირდებით დეტალებისთვის" },
] as const;

export type PaymentMethod = (typeof paymentMethods)[number]["id"];

export const deliveryCost = (subtotal: number) =>
  subtotal === 0 || subtotal >= delivery.freeFrom ? 0 : delivery.price;

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

export const paymentLabel = (id: string) => paymentMethods.find((m) => m.id === id)?.label ?? id;
export const statusLabel = (id: string) => orderStatuses.find((s) => s.id === id)?.label ?? id;
