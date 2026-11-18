import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const instant = false;

export const metadata: Metadata = { title: "შესვლა" };

export default function LoginPage() {
  return (
    <div className="adm-login">
      <div className="adm-login-art">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-on-dark.png" alt="SportHub" width={180} height={41} />
        <p>მაღაზიის მართვა: შეკვეთები, პროდუქცია, კატეგორიები და მთავარი გვერდი.</p>
      </div>
      <div className="adm-login-form">
        <LoginForm />
      </div>
    </div>
  );
}
