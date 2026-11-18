import Link from "next/link";

export default function NotFound() {
  return (
    <section className="catalog section-padding">
      <div className="container">
        <div className="catalog-empty">
          <h2>გვერდი ვერ მოიძებნა</h2>
          <p>შესაძლოა ბმული შეცვლილია ან პროდუქტი აღარ არის ხელმისაწვდომი.</p>
          <Link href="/catalog" className="thm-btn">
            კატალოგი
          </Link>
        </div>
      </div>
    </section>
  );
}
