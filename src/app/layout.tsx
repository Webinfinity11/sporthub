import type { Metadata } from "next";
import { Noto_Sans_Georgian, Oregano, Oswald, Raleway, Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
  style: ["normal", "italic"],
});

// Roboto has no Georgian glyphs, so Georgian text falls through to this font.
const georgian = Noto_Sans_Georgian({
  variable: "--font-georgian",
  subsets: ["georgian"],
});

const oregano = Oregano({
  variable: "--font-oregano",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "SportHub | სპორტული მაღაზია",
    template: "%s | SportHub",
  },
  description: "სარბენი ბილიკები, სავარჯიშო ველოსიპედები, სავარჯიშო თხილამურები და მძიმე წონები სახლისა და დარბაზისთვის.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ka"
      className={`${roboto.variable} ${georgian.variable} ${oregano.variable} ${oswald.variable} ${raleway.variable}`}
    >
      {/* Browser extensions (e.g. ColorZilla) inject attributes into <body> before hydration. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
