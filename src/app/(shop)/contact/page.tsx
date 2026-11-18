import type { Metadata } from "next";
import CallCta from "@/components/CallCta";
import ContactCards from "@/components/ContactCards";
import PageTitle from "@/components/PageTitle";

export const metadata: Metadata = { title: "კონტაქტი" };

export default function ContactPage() {
  return (
    <>
      <PageTitle title="კონტაქტი" image="/img/slides/hero-exercise-bike.webp" />
      <section className="contact-info section-padding">
        <div className="container">
          <ContactCards />
        </div>
      </section>
      <CallCta />
    </>
  );
}
