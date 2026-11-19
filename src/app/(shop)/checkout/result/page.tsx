import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { FaCheck, FaClock, FaTimes } from "react-icons/fa";
import ClearCart from "@/components/ClearCart";
import { db, orders } from "@/db";
import { bogEnabled } from "@/lib/bog";
import { formatPrice, telHref } from "@/lib/data";
import { siteOrigin, syncBogPayment, syncInstallment } from "@/lib/payments";
import { getSiteSettings } from "@/lib/queries";
import { tbcEnabled } from "@/lib/tbc";
import { retryCardPayment } from "../actions";

export const metadata: Metadata = { title: "გადახდის შედეგი" };

// The buyer lands here from the bank's page: BOG card payment or TBC installment application.
export default function PaymentResultPage({ searchParams }: PageProps<"/checkout/result">) {
  return (
    <Suspense fallback={<section className="co-done" style={{ minHeight: "60vh" }} aria-busy="true" />}>
      <Result searchParams={searchParams} />
    </Suspense>
  );
}

async function Result({ searchParams }: { searchParams: PageProps<"/checkout/result">["searchParams"] }) {
  const sp = await searchParams;
  const number = String(sp.order ?? "").slice(0, 40);
  const [order] = number
    ? await db
        .select({
          id: orders.id,
          number: orders.number,
          total: orders.total,
          payment: orders.payment,
          state: orders.paymentStatus,
          bogOrderId: orders.bogOrderId,
          tbcSessionId: orders.tbcSessionId,
        })
        .from(orders)
        .where(eq(orders.number, number))
        .limit(1)
    : [];
  const settings = await getSiteSettings();
  const phone = settings.phones[0];

  if (!order || (order.payment !== "card" && order.payment !== "installment")) {
    return (
      <Card icon={<FaTimes />} tone="fail" title="შეკვეთა ვერ მოიძებნა">
        <p>შეამოწმეთ ბმული ან დაგვიკავშირდით.</p>
        <Actions phone={phone} />
      </Card>
    );
  }

  // the bank's redirect can arrive before its callback: ask the bank directly while still open
  let state = order.state;
  const origin = siteOrigin(await headers());
  try {
    if (order.payment === "card" && state === "pending" && order.bogOrderId && bogEnabled) state = await syncBogPayment(order.bogOrderId, origin);
    if (order.payment === "installment" && (state === "pending" || state === "awaiting") && order.tbcSessionId && tbcEnabled)
      state = (await syncInstallment(order.id, origin)) ?? state;
  } catch (e) {
    console.error("payment status check failed", order.number, e);
  }

  if (order.payment === "installment") return <InstallmentResult number={order.number} total={order.total} state={state} phone={phone} />;

  if (state === "paid") {
    return (
      <Card icon={<FaCheck />} tone="ok" title="გადახდა წარმატებულია">
        <ClearCart />
        <p className="co-done-number">
          შეკვეთის ნომერი <strong>{order.number}</strong>, გადახდილია {formatPrice(order.total)}
        </p>
        <ol className="co-next">
          <li>
            <strong>დადასტურება</strong>
            <span>მენეჯერი დაგირეკავთ{settings.hours ? ` სამუშაო საათებში (${settings.hours})` : ""}.</span>
          </li>
          <li>
            <strong>მიწოდება</strong>
            <span>შეკვეთა დამუშავდება 2 სამუშაო დღეში და მოგივათ დამუშავებიდან 2-3 სამუშაო დღეში.</span>
          </li>
        </ol>
        <Actions phone={phone} />
      </Card>
    );
  }

  if (state === "failed") {
    return (
      <Card icon={<FaTimes />} tone="fail" title="გადახდა ვერ შესრულდა">
        <p>
          შეკვეთა <strong>{order.number}</strong> შენახულია, მაგრამ თანხა არ ჩამოგეჭრათ. სცადეთ თავიდან ან აირჩიეთ სხვა გადახდის მეთოდი.
        </p>
        <div className="co-done-actions">
          <form action={retryCardPayment.bind(null, order.number)}>
            <button type="submit" className="thm-btn">
              თავიდან გადახდა
            </button>
          </form>
          <Link href="/checkout" className="co-link">
            სხვა მეთოდის არჩევა
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card icon={<FaClock />} tone="wait" title="გადახდა მუშავდება">
      <p>
        შეკვეთა <strong>{order.number}</strong>. ბანკის პასუხს ველოდებით, ეს ჩვეულებრივ რამდენიმე წამი გრძელდება.
      </p>
      <div className="co-done-actions">
        <Link href={`/checkout/result?order=${encodeURIComponent(order.number)}`} className="thm-btn">
          განახლება
        </Link>
      </div>
    </Card>
  );
}

function InstallmentResult({ number, total, state, phone }: { number: string; total: number; state: string; phone?: string }) {
  if (state === "failed") {
    return (
      <Card icon={<FaTimes />} tone="fail" title="განვადება ვერ გაფორმდა">
        <p>
          შეკვეთა <strong>{number}</strong>: ბანკმა განაცხადი არ დაამტკიცა ან ის გაუქმდა. შეგიძლიათ აირჩიოთ სხვა გადახდის მეთოდი.
        </p>
        <div className="co-done-actions">
          <Link href="/checkout" className="thm-btn">
            სხვა მეთოდის არჩევა
          </Link>
          {phone && (
            <a href={telHref(phone)} className="co-link">
              {phone}
            </a>
          )}
        </div>
      </Card>
    );
  }
  const approved = state === "awaiting" || state === "paid";
  return (
    <Card icon={approved ? <FaCheck /> : <FaClock />} tone={approved ? "ok" : "wait"} title={approved ? "განვადება დამტკიცდა" : "განვადების განაცხადი მიღებულია"}>
      <ClearCart />
      <p className="co-done-number">
        შეკვეთის ნომერი <strong>{number}</strong>, ჯამი {formatPrice(total)}
      </p>
      <ol className="co-next">
        <li>
          <strong>ბანკი</strong>
          <span>
            {approved
              ? "TBC ბანკმა განაცხადი დაამტკიცა."
              : "TBC ბანკი განიხილავს განაცხადს. ზოგჯერ საჭიროა შემოსავლის დოკუმენტის ატვირთვა, ბანკი თავად შეგატყობინებთ."}
          </span>
        </li>
        <li>
          <strong>დადასტურება</strong>
          <span>ბანკის დამტკიცების შემდეგ მენეჯერი დაგიკავშირდებათ და შეგითანხმებთ მიწოდებას.</span>
        </li>
      </ol>
      <Actions phone={phone} />
    </Card>
  );
}

function Card({ icon, tone, title, children }: { icon: React.ReactNode; tone: "ok" | "fail" | "wait"; title: string; children: React.ReactNode }) {
  return (
    <section className="co-done">
      <div className="container">
        <div className={`co-done-card co-result-${tone}`}>
          <span className="co-done-icon" aria-hidden>
            {icon}
          </span>
          <h1>{title}</h1>
          {children}
        </div>
      </div>
    </section>
  );
}

function Actions({ phone }: { phone?: string }) {
  return (
    <div className="co-done-actions">
      <Link href="/catalog" className="thm-btn">
        ყიდვის გაგრძელება
      </Link>
      {phone && (
        <a href={telHref(phone)} className="co-link">
          {phone}
        </a>
      )}
    </div>
  );
}
