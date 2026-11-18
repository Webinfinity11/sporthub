import type { Metadata } from "next";
import "./admin.css";

// The admin always renders fresh data per request; instant (prefetched) navigation is not needed here.
export const instant = false;

export const metadata: Metadata = {
  title: { default: "ადმინი", template: "%s | SportHub ადმინი" },
  robots: { index: false, follow: false },
};

export default function AdminRoot({ children }: LayoutProps<"/admin">) {
  return <div className="adm">{children}</div>;
}
