"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import {
  FaAngleDown,
  FaAngleRight,
  FaCalendarCheck,
  FaCheck,
  FaLock,
  FaMoneyBillWave,
  FaPhoneAlt,
  FaShoppingBag,
  FaTag,
  FaTimes,
  FaTruck,
  FaUniversity,
} from "react-icons/fa";
import { useStore } from "./Store";
import { checkPromo, placeOrder, type OrderState } from "@/app/(shop)/checkout/actions";
import { delivery, deliveryCost, formatPrice, paymentMethods, promoDiscount, telHref, type PaymentMethod } from "@/lib/data";
import { useSiteSettings } from "./SiteSettings";

const payIcons: Record<PaymentMethod, React.ComponentType> = {
  cash: FaMoneyBillWave,
  transfer: FaUniversity,
  installment: FaCalendarCheck,
};

function Steps({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "კალათა", href: "/cart" },
    { n: 2, label: "შეკვეთის დეტალები" },
    { n: 3, label: "დადასტურება" },
  ] as const;
  return (
    <ol className="co-steps" aria-label="შეკვეთის ეტაპები">
      {steps.map((s, i) => {
        const state = s.n < current ? "done" : s.n === current ? "current" : "todo";
        return (
          <li key={s.n} className={state} aria-current={state === "current" ? "step" : undefined}>
            {"href" in s && state === "done" ? <Link href={s.href}>{s.label}</Link> : <span>{s.label}</span>}
            {i < steps.length - 1 && <FaAngleRight className="co-steps-sep" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

function Field({
  id,
  label,
  error,
  optional,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`co-field${error ? " has-error" : ""}`}>
      <label htmlFor={id}>
        {label}
        {optional && <span className="optional">არასავალდებულო</span>}
      </label>
      {children}
      {error && (
        <p className="co-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

type Promo = { code: string; percent: number } | null;

function Summary({ variant, promo }: { variant: "mobile" | "panel"; promo: Promo }) {
  const { cart, cartSubtotal, cartCount } = useStore();
  const ship = deliveryCost(cartSubtotal);
  const discount = promo ? promoDiscount(cartSubtotal, promo.percent) : 0;
  const total = cartSubtotal - discount + ship;
  const left = delivery.freeFrom - cartSubtotal;

  const body = (
    <>
      <ul className="co-items">
        {cart.map((l) => (
          <li key={l.id}>
            <span className="co-thumb">
              <img src={l.product.image} alt="" />
              <span className="co-qty" aria-label={`რაოდენობა ${l.qty}`}>
                {l.qty}
              </span>
            </span>
            <span className="co-item-name">{l.product.name}</span>
            <span className="co-item-price">{formatPrice(l.total)}</span>
          </li>
        ))}
      </ul>
      <dl className="co-totals">
        <div>
          <dt>პროდუქტები ({cartCount})</dt>
          <dd>{formatPrice(cartSubtotal)}</dd>
        </div>
        {promo && (
          <div className="co-discount">
            <dt>
              ფასდაკლება {promo.percent}% ({promo.code})
            </dt>
            <dd>-{formatPrice(discount)}</dd>
          </div>
        )}
        <div>
          <dt>მიწოდება</dt>
          <dd>{ship === 0 ? <span className="free">უფასო</span> : formatPrice(ship)}</dd>
        </div>
        <div className="co-grand">
          <dt>სულ გადასახდელი</dt>
          <dd>{formatPrice(total)}</dd>
        </div>
      </dl>
      {ship > 0 && left > 0 && (
        <p className="co-free-hint">
          <FaTruck /> კიდევ {formatPrice(left)} და მიწოდება უფასოა
        </p>
      )}
      <Link href="/cart" className="co-edit">
        კალათის რედაქტირება
      </Link>
    </>
  );

  if (variant === "mobile") {
    // mobile: collapsible summary above the form
    return (
      <details className="co-summary-mobile">
        <summary>
          <span>
            <FaShoppingBag /> შეკვეთის ჯამი <FaAngleDown className="chev" />
          </span>
          <strong>{formatPrice(total)}</strong>
        </summary>
        <div className="co-summary-body">{body}</div>
      </details>
    );
  }

  // desktop: sticky side panel
  return (
    <div className="co-summary">
      <h2>შეკვეთა</h2>
      {body}
    </div>
  );
}

function Done({ orderNumber, total }: { orderNumber: string; total: number }) {
  const { phones, hours } = useSiteSettings();
  const phone = phones[0];
  return (
    <section className="co-done">
      <div className="container">
        <Steps current={3} />
        <div className="co-done-card">
          <span className="co-done-icon" aria-hidden>
            <FaCheck />
          </span>
          <h1>მადლობა, შეკვეთა მიღებულია</h1>
          <p className="co-done-number">
            შეკვეთის ნომერი <strong>{orderNumber}</strong>
          </p>
          <ol className="co-next">
            <li>
              <strong>დადასტურება</strong>
              <span>მენეჯერი დაგირეკავთ{hours ? ` სამუშაო საათებში (${hours})` : ""}.</span>
            </li>
            <li>
              <strong>მიწოდება</strong>
              <span>შეკვეთა მოგივათ 1-3 სამუშაო დღეში.</span>
            </li>
            <li>
              <strong>გადახდა</strong>
              <span>ჯამი: {formatPrice(total)}, არჩეული მეთოდით.</span>
            </li>
          </ol>
          <div className="co-done-actions">
            <Link href="/catalog" className="thm-btn">
              ყიდვის გაგრძელება
            </Link>
            {phone && (
              <a href={telHref(phone)} className="co-link">
                <FaPhoneAlt /> {phone}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function CheckoutView() {
  const phone = useSiteSettings().phones[0];
  const { cart, clearCart } = useStore();
  const [state, action, pending] = useActionState<OrderState, FormData>(placeOrder, { status: "idle" });
  const errors = state.status === "error" ? state.fields : {};
  const [promo, setPromo] = useState<Promo>(null);
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [checking, startCheck] = useTransition();
  const applyPromo = () => {
    if (!promoInput.trim()) return;
    startCheck(async () => {
      const r = await checkPromo(promoInput);
      if (r.ok) {
        setPromo({ code: r.code, percent: r.percent });
        setPromoInput("");
        setPromoError("");
      } else setPromoError(r.error);
    });
  };

  useEffect(() => {
    if (state.status === "ok") clearCart();
  }, [state, clearCart]);

  if (state.status === "ok") return <Done orderNumber={state.orderNumber} total={state.total} />;

  if (cart.length === 0) {
    return (
      <section className="catalog section-padding">
        <div className="container">
          <div className="catalog-empty">
            <FaShoppingBag className="empty-icon" />
            <h2>კალათა ცარიელია</h2>
            <p>შეკვეთის გასაფორმებლად დაამატეთ პროდუქტები.</p>
            <Link href="/catalog" className="thm-btn">
              კატალოგი
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const aria = (k: string) =>
    errors[k] ? { "aria-invalid": true as const, "aria-describedby": `${k}-error` } : {};

  return (
    <section className="checkout">
      <div className="container">
        <form action={action} className="co-grid" noValidate>
          <input type="hidden" name="items" value={JSON.stringify(cart.map(({ id, qty }) => ({ id, qty })))} />

          <div className="co-main">
            <Steps current={2} />
            <h1 className="co-title">შეკვეთის გაფორმება</h1>

            <Summary variant="mobile" promo={promo} />

            {state.status === "error" && (
              <p className="co-alert" role="alert">
                {state.message}
              </p>
            )}

            <div className="co-section">
              <h2>საკონტაქტო ინფორმაცია</h2>
              <div className="co-row">
                <Field id="name" label="სახელი და გვარი" error={errors.name}>
                  <input id="name" name="name" autoComplete="name" required {...aria("name")} />
                </Field>
                <Field id="phone" label="მობილური" error={errors.phone}>
                  <div className="co-prefix">
                    <span aria-hidden>+995</span>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="5XX XXX XXX"
                      required
                      {...aria("phone")}
                    />
                  </div>
                </Field>
              </div>
            </div>

            <div className="co-section">
              <h2>მიწოდების მისამართი</h2>
              <div className="co-row co-row-city">
                <Field id="city" label="ქალაქი" error={errors.city}>
                  <select id="city" name="city" defaultValue="" required {...aria("city")}>
                    <option value="" disabled>
                      აირჩიეთ ქალაქი
                    </option>
                    {delivery.cities.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field id="address" label="ქუჩა, სახლი, ბინა" error={errors.address}>
                  <input id="address" name="address" autoComplete="street-address" required {...aria("address")} />
                </Field>
              </div>
              <Field id="comment" label="კომენტარი კურიერისთვის" optional>
                <textarea id="comment" name="comment" rows={2} placeholder="მაგ. სადარბაზოს კოდი" />
              </Field>
            </div>

            <div className="co-section">
              <h2>გადახდა</h2>
              <div className="co-pay" role="radiogroup" aria-label="გადახდის მეთოდი">
                {paymentMethods.map((m, i) => {
                  const Icon = payIcons[m.id];
                  return (
                    <label key={m.id} className="co-pay-option">
                      <input type="radio" name="payment" value={m.id} defaultChecked={i === 0} />
                      <span className="co-pay-card">
                        <span className="co-pay-icon" aria-hidden>
                          <Icon />
                        </span>
                        <strong>{m.label}</strong>
                        <small>{m.hint}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
              {errors.payment && <p className="co-error">{errors.payment}</p>}
            </div>

            <div className="co-section">
              <h2>პრომო კოდი</h2>
              <input type="hidden" name="promo" value={promo?.code ?? ""} />
              {promo ? (
                <div className="co-promo-applied">
                  <FaTag aria-hidden />
                  <span>
                    <strong>{promo.code}</strong> გამოყენებულია, ფასდაკლება {promo.percent}%
                  </span>
                  <button type="button" aria-label="პრომო კოდის წაშლა" onClick={() => setPromo(null)}>
                    <FaTimes />
                  </button>
                </div>
              ) : (
                <div className={`co-field${promoError ? " has-error" : ""}`}>
                  <label htmlFor="promo-code">
                    კოდი <span className="optional">არასავალდებულო</span>
                  </label>
                  <div className="co-promo">
                    <input
                      id="promo-code"
                      value={promoInput}
                      autoComplete="off"
                      autoCapitalize="characters"
                      placeholder="შეიყვანეთ კოდი"
                      aria-invalid={promoError ? true : undefined}
                      aria-describedby={promoError ? "promo-error" : undefined}
                      onChange={(e) => {
                        setPromoInput(e.target.value);
                        setPromoError("");
                      }}
                      onKeyDown={(e) => {
                        // Enter applies the code instead of submitting the order
                        if (e.key === "Enter") {
                          e.preventDefault();
                          applyPromo();
                        }
                      }}
                    />
                    <button type="button" className="co-promo-btn" disabled={checking || !promoInput.trim()} onClick={applyPromo}>
                      {checking ? "..." : "გამოყენება"}
                    </button>
                  </div>
                  {promoError && (
                    <p className="co-error" id="promo-error">
                      {promoError}
                    </p>
                  )}
                </div>
              )}
              {errors.promo && <p className="co-error">{errors.promo}</p>}
            </div>

            <div className="co-submit">
              <button type="submit" className="thm-btn" disabled={pending}>
                {pending ? "იგზავნება..." : "შეკვეთის დადასტურება"}
              </button>
              <p>
                <FaLock aria-hidden /> გადახდა ხდება შეკვეთის დადასტურების შემდეგ.
                {phone && (
                  <>
                    {" "}კითხვები? <a href={telHref(phone)}>{phone}</a>
                  </>
                )}
              </p>
            </div>
          </div>

          <aside className="co-aside" aria-label="შეკვეთის ჯამი">
            <Summary variant="panel" promo={promo} />
          </aside>
        </form>
      </div>
    </section>
  );
}
