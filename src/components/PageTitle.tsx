import Link from "next/link";

/** Inner-page header: dark band, photo fading in from the right, white title with the blue accent line. */
export default function PageTitle({
  title,
  image = "/img/slides/hero-treadmill.webp",
}: {
  title: string;
  image?: string;
}) {
  return (
    <section className="page-title">
      <div className="page-title-photo" style={{ backgroundImage: `url(${image})` }} aria-hidden />
      <div className="container">
        <nav className="breadcrumb" aria-label="breadcrumb">
          <Link href="/">მთავარი</Link>
          <span className="sep" aria-hidden>
            /
          </span>
          <span aria-current="page">{title}</span>
        </nav>
        <h1>{title}</h1>
        <span className="accent" aria-hidden />
      </div>
    </section>
  );
}
