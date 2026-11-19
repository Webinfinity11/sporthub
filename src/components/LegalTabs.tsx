import Link from "next/link";
import { legalPages } from "@/lib/data";

/** Switches between the shop's legal documents; shown above each of them. */
export default function LegalTabs({ current }: { current: string }) {
  return (
    <nav className="legal-tabs" aria-label="დოკუმენტები">
      {legalPages.map((p) => (
        <Link key={p.href} href={p.href} aria-current={p.href === current ? "page" : undefined}>
          {p.label}
        </Link>
      ))}
    </nav>
  );
}
