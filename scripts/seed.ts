// One-time seed: moves the current test content into the database.
// Run: npm run db:seed   (skips if products already exist; pass --force to wipe and reseed)
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as s from "../src/db/schema";

const force = process.argv.includes("--force");
const url = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString: url, max: 1, ssl: /sslmode=require/.test(url) ? { rejectUnauthorized: false } : undefined });
const db = drizzle(pool, { schema: s });

const specsBy: Record<string, { description: string; specs: [string, string][] }> = {
  treadmills: {
    description: "სახლისა და დარბაზისთვის განკუთვნილი სარბენი ბილიკი ჩუმი ძრავით, ამორტიზაციის სისტემით და მარტივი მართვის პანელით.",
    specs: [["ძრავის სიმძლავრე", "3.0 HP"], ["სიჩქარე", "1-18 კმ/სთ"], ["დახრა", "0-15%"], ["სარბენი ზედაპირი", "140 x 50 სმ"], ["მაქსიმალური წონა", "150 კგ"], ["გარანტია", "2 წელი"]],
  },
  "exercise-bikes": {
    description: "კომპაქტური ველოტრენაჟორი რეგულირებადი სავარძლითა და წინააღმდეგობით, კარდიო ვარჯიშისთვის სახლში.",
    specs: [["წინააღმდეგობა", "მაგნიტური, 8 დონე"], ["მფრენი", "6 კგ"], ["ეკრანი", "LCD: დრო, სიჩქარე, კალორია"], ["მაქსიმალური წონა", "120 კგ"], ["გარანტია", "2 წელი"]],
  },
  "ski-trainers": {
    description: "მთელი სხეულის ვარჯიში სახსრებზე დატვირთვის გარეშე. შესაფერისია ყველა ასაკისთვის.",
    specs: [["ნაბიჯის სიგრძე", "40 სმ"], ["წინააღმდეგობა", "16 დონე"], ["ეკრანი", "LCD"], ["მაქსიმალური წონა", "130 კგ"], ["გარანტია", "2 წელი"]],
  },
  weights: {
    description: "ძალისმიერი ვარჯიშის ინვენტარი სახლისა და დარბაზისთვის, მყარი და გამძლე მასალისგან.",
    specs: [["მასალა", "ფოლადი, რეზინის საფარით"], ["დანიშნულება", "სახლი, დარბაზი"], ["გარანტია", "1 წელი"]],
  },
};

const topCategories = [
  { slug: "treadmills", name: "სარბენი ბილიკები", image: "/img/categories/cat-treadmill.webp" },
  { slug: "exercise-bikes", name: "სავარჯიშო ველოსიპედები", image: "/img/categories/cat-exercise-bike.webp" },
  { slug: "ski-trainers", name: "სავარჯიშო თხილამურები", image: "/img/categories/cat-ski.webp" },
  { slug: "weights", name: "მძიმე წონები", image: "/img/categories/cat-weights.webp" },
];
// example subcategories (test)
const subCategories = [
  { slug: "plates", name: "დისკები", parent: "weights" },
  { slug: "accessories", name: "აქსესუარები", parent: "weights" },
];

// [slug, name, image, price, oldPrice, category]
const productRows: [string, string, string, number, number | null, string][] = [
  ["kobo-stepper", "Kobo მრავალფუნქციური სტეპერი", "/img/shop/1.jpg", 1899, 2490, "ski-trainers"],
  ["ceb-604a-air-bike", "CEB-604 A საჰაერო ველოტრენაჟორი", "/img/shop/2.jpg", 649, 799, "exercise-bikes"],
  ["bsa-duatron", "BSA Duatron ველოტრენაჟორი", "/img/shop/3.jpg", 1290, 1590, "exercise-bikes"],
  ["rocket-twister", "Rocket Twister ტრენაჟორი", "/img/shop/4.jpg", 89, 129, "accessories"],
  ["weight-plate-25kg", "ჰანტელის დისკი 25 კგ", "/img/shop/5.jpg", 249, 299, "plates"],
  ["muscle-pharm-assault", "Muscle Pharm Assault", "/img/shop/6.jpg", 119, null, "accessories"],
  ["ab-wheel", "პრესის ბორბალი სადგამით", "/img/shop/7.jpg", 39, 59, "accessories"],
  ["muscle-pharm-cla", "Muscle Pharm CLA", "/img/shop/8.jpg", 79, null, "accessories"],
  ["magnetic-bike-emb-102", "მაგნიტური ველოტრენაჟორი EMB-102", "/img/shop/9.jpg", 899, 1190, "exercise-bikes"],
  ["prorun-t500", "სარბენი ბილიკი ProRun T500", "/img/categories/cat-treadmill.webp", 2490, 2990, "treadmills"],
  ["compact-t300", "სარბენი ბილიკი Compact T300", "/img/categories/cat-treadmill.webp", 1590, null, "treadmills"],
  ["atlas-x7", "სარბენი ბილიკი Atlas X7", "/img/categories/cat-treadmill.webp", 3890, 4390, "treadmills"],
  ["fitline-220", "სარბენი ბილიკი FitLine 220", "/img/categories/cat-treadmill.webp", 1190, 1390, "treadmills"],
  ["velocity-s9", "სარბენი ბილიკი Velocity S9", "/img/categories/cat-treadmill.webp", 5490, null, "treadmills"],
  ["magnetic-bike-comfort", "მაგნიტური ველოტრენაჟორი Comfort", "/img/categories/cat-exercise-bike.webp", 749, 899, "exercise-bikes"],
  ["airpro-bike", "საჰაერო ველოტრენაჟორი AirPro", "/img/shop/2.jpg", 589, null, "exercise-bikes"],
];

async function main() {
  const existing = await db.select({ id: s.products.id }).from(s.products).limit(1);
  if (existing.length && !force) {
    console.log("database already has products, skipping (use --force to reseed)");
    return;
  }
  if (force) {
    await db.delete(s.orderItems);
    await db.delete(s.orders);
    await db.delete(s.products);
    await db.delete(s.categories);
    await db.delete(s.heroSlides);
    await db.delete(s.media);
  }

  const catId = new Map<string, number>();
  for (const [i, c] of topCategories.entries()) {
    const [row] = await db.insert(s.categories).values({ ...c, sortOrder: i }).returning({ id: s.categories.id });
    catId.set(c.slug, row.id);
  }
  for (const [i, c] of subCategories.entries()) {
    const [row] = await db
      .insert(s.categories)
      .values({ slug: c.slug, name: c.name, parentId: catId.get(c.parent)!, sortOrder: i })
      .returning({ id: s.categories.id });
    catId.set(c.slug, row.id);
  }
  const rootOf = (slug: string) => subCategories.find((c) => c.slug === slug)?.parent ?? slug;

  for (const [i, [slug, name, image, price, oldPrice, cat]] of productRows.entries()) {
    const d = specsBy[rootOf(cat)];
    await db.insert(s.products).values({
      slug,
      name,
      images: [image],
      price,
      oldPrice,
      categoryId: catId.get(cat)!,
      description: d.description,
      specs: d.specs,
      stock: 10,
      sortOrder: i,
    });
  }

  await db.insert(s.heroSlides).values([
    {
      image: "/img/slides/hero-treadmill.webp",
      align: "right",
      position: "center 70%",
      shade: "right",
      titleLines: [{ text: "სარბენი" }, { text: "ბილიკები", offer: "-20%" }],
      subtitle: "ახალი კოლექცია უკვე",
      subtitleHighlight: "SportHub-ში",
      large: "ფასდაკლება 40%-მდე",
      primaryLabel: "ყიდვა",
      primaryHref: "/catalog?category=treadmills",
      secondaryLabel: "დეტალურად",
      secondaryHref: "/catalog?category=treadmills",
      sortOrder: 0,
    },
    {
      image: "/img/slides/hero-exercise-bike.webp",
      align: "right",
      position: "center center",
      shade: "right",
      titleLines: [{ text: "სავარჯიშო" }, { text: "ველოსიპედები" }],
      subtitle: "ახალი კოლექცია უკვე",
      subtitleHighlight: "SportHub-ში",
      large: "ფასდაკლება 40%-მდე",
      primaryLabel: "ყიდვა",
      primaryHref: "/catalog?category=exercise-bikes",
      secondaryLabel: "დეტალურად",
      secondaryHref: "/catalog?category=exercise-bikes",
      sortOrder: 1,
    },
  ]);

  console.log(`seeded ${catId.size} categories, ${productRows.length} products, 2 hero slides`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
