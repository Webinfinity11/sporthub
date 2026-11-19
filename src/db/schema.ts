import { relations } from "drizzle-orm";
import {
  boolean,
  customType,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

// Money is stored as numeric(10,2) and read as a JS number.
const money = (name: string) => numeric(name, { precision: 10, scale: 2, mode: "number" });

/** Legacy uploads kept in Postgres, served at /media/:id. New uploads go to Cloudflare R2 when it is configured (src/lib/storage.ts). */
export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  parentId: integer("parent_id").references((): AnyPgColumn => categories.id, { onDelete: "set null" }),
  /** product cutout used on the homepage category banner (top-level categories) */
  image: text("image"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export type Spec = [string, string];

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  price: money("price").notNull(),
  oldPrice: money("old_price"),
  /** delivery price of this product inside Tbilisi and to the rest of the country (0 = free) */
  deliveryTbilisi: money("delivery_tbilisi").notNull().default(15),
  deliveryRegions: money("delivery_regions").notNull().default(15),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  /** image URLs: R2 public URL or "/media/<uuid>" for uploads, "/img/..." for bundled files; first = main */
  images: jsonb("images").$type<string[]>().notNull().default([]),
  specs: jsonb("specs").$type<Spec[]>().notNull().default([]),
  stock: integer("stock").notNull().default(0),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TitleLine = { text: string; offer?: string };

export const heroSlides = pgTable("hero_slides", {
  id: serial("id").primaryKey(),
  /** photo; on a video slide it is the optional poster shown while the video loads and when motion is reduced */
  image: text("image"),
  /** optional background video (R2 URL, MP4 or WebM) */
  video: text("video"),
  align: text("align").$type<"left" | "center" | "right">().notNull().default("right"),
  /** CSS background-position of the photo */
  position: text("position").notNull().default("center center"),
  shade: text("shade").$type<"none" | "left" | "right">().notNull().default("none"),
  titleLines: jsonb("title_lines").$type<TitleLine[]>().notNull().default([]),
  subtitle: text("subtitle").notNull().default(""),
  subtitleHighlight: text("subtitle_highlight").notNull().default(""),
  large: text("large").notNull().default(""),
  primaryLabel: text("primary_label").notNull().default(""),
  primaryHref: text("primary_href").notNull().default("/catalog"),
  secondaryLabel: text("secondary_label").notNull().default(""),
  secondaryHref: text("secondary_href").notNull().default("/catalog"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

/** Single row (id = 1): contact details and social links shown on the storefront. */
export const siteSettings = pgTable("site_settings", {
  id: integer("id").primaryKey().default(1),
  phones: jsonb("phones").$type<string[]>().notNull().default([]),
  addresses: jsonb("addresses").$type<string[]>().notNull().default([]),
  email: text("email").notNull().default(""),
  hours: text("hours").notNull().default(""),
  facebook: text("facebook").notNull().default(""),
  instagram: text("instagram").notNull().default(""),
  tiktok: text("tiktok").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Discount codes. maxUses 1 = single use; null maxUses / expiresAt = no limit of that kind. */
export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  percent: integer("percent").notNull(),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderStatus = pgEnum("order_status", ["new", "confirmed", "shipped", "delivered", "cancelled"]);
export type OrderStatus = (typeof orderStatus.enumValues)[number];

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  number: text("number").notNull().unique(),
  status: orderStatus("status").notNull().default("new"),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  /** optional, the customer may leave it empty */
  email: text("email").notNull().default(""),
  /** delivery zone label: "თბილისი" or "თბილისის გარეთ" */
  city: text("city").notNull(),
  address: text("address").notNull(),
  comment: text("comment").notNull().default(""),
  payment: text("payment").notNull(),
  /** card payments only: "pending" | "paid" | "failed" | "refunded"; empty for cash and transfer */
  paymentStatus: text("payment_status").notNull().default(""),
  /** the bank's order id for a card payment (Bank of Georgia) */
  bogOrderId: text("bog_order_id"),
  /** TBC installment application session */
  tbcSessionId: text("tbc_session_id"),
  /** last status text from the bank, shown in the admin */
  paymentDetail: text("payment_detail").notNull().default(""),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  subtotal: money("subtotal").notNull(),
  delivery: money("delivery").notNull(),
  /** promo code discount (already subtracted from total) */
  promoCode: text("promo_code"),
  discount: money("discount").notNull().default(0),
  total: money("total").notNull(),
  /** internal note, only visible in the admin */
  adminNote: text("admin_note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Snapshot of what was bought (survives later product edits/deletion). */
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  image: text("image"),
  price: money("price").notNull(),
  qty: integer("qty").notNull(),
});

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, { fields: [categories.parentId], references: [categories.id], relationName: "tree" }),
  children: many(categories, { relationName: "tree" }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
}));

export const ordersRelations = relations(orders, ({ many }) => ({ items: many(orderItems) }));
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));
