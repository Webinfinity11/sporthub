"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import {
  FaAngleDown,
  FaAngleRight,
  FaCalendarCheck,
  FaCheck,
  FaChartPie,
  FaCreditCard,
  FaLock,
  FaMapMarkerAlt,
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
import { deliveryCost, deliveryZones, formatPrice, paymentMethods, promoDiscount, shipText, telHref, zoneLabel, type DeliveryZone, type PaymentMethod } from "@/lib/data";
import { useSiteSettings } from "./SiteSettings";

const payIcons: Record<PaymentMethod, React.ComponentType> = {
  card: FaCreditCard,
  cash: FaMoneyBillWave,
  transfer: FaUniversity,
  installment: FaCalendarCheck,
  split: FaChartPie,
};

const zoneIcons: Record<DeliveryZone, React.ComponentType> = {
  tbilisi: FaMapMarkerAlt,
  regions: FaTruck,
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

function Summary({ variant, promo, zone }: { variant: "mobile" | "panel"; promo: Promo; zone: DeliveryZone | null }) {
  const { cart, cartSubtotal, cartCount } = useStore();
  // no zone yet: delivery is not known, the total shows the products only
  const ship = zone ? deliveryCost(cart.map((l) => l.product), zone) : null;
  const discount = promo ? promoDiscount(cartSubtotal, promo.percent) : 0;
  const total = cartSubtotal - discount + (ship ?? 0);

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
          <dt>მიწოდება{zone && <> ({zoneLabel(zone)})</>}</dt>
          <dd>{ship === null ? <span className="muted">აირჩიეთ ზონა</span> : ship === 0 ? <span className="free">უფასო</span> : formatPrice(ship)}</dd>
        </div>
        <div className="co-grand">
          <dt>სულ გადასახდელი</dt>
          <dd>{formatPrice(total)}</dd>
        </div>
      </dl>
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
              <span>შეკვეთა დამუშავდება 2 სამუშაო დღეში და მოგივათ დამუშავებიდან 2-3 სამუშაო დღეში. დღესა და დროს ტელეფონით შეგითანხმებთ.</span>
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

/** Online methods show only when their credentials are set: card (Bank of Georgia), installment (TBC), split (Flitt). */
export default function CheckoutView({
  cardEnabled = false,
  installmentEnabled = false,
  splitEnabled = false,
}: {
  cardEnabled?: boolean;
  installmentEnabled?: boolean;
  splitEnabled?: boolean;
}) {
  const phone = useSiteSettings().phones[0];
  const { cart, clearCart } = useStore();
  const items = cart.map((l) => l.product);
  const [state, action, pending] = useActionState<OrderState, FormData>(placeOrder, { status: "idle" });
  const errors = state.status === "error" ? state.fields : {};
  // typed values come back with an error, so the reset form keeps them
  const typed: Record<string, string> = state.status === "error" ? state.values : {};
  const [promo, setPromo] = useState<Promo>(null);
  const [zone, setZone] = useState<DeliveryZone | null>(null);
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

  const enabled: Record<string, boolean> = { card: cardEnabled, installment: installmentEnabled, split: splitEnabled };
  const methods = paymentMethods.filter((m) => enabled[m.id] ?? true);

  useEffect(() => {
    if (state.status === "ok") clearCart();
    // card: off to the bank; the cart is cleared on the result page once the payment is confirmed
    if (state.status === "redirect") window.location.assign(state.url);
  }, [state, clearCart]);

  if (state.status === "ok") return <Done orderNumber={state.orderNumber} total={state.total} />;
  if (state.status === "redirect") {
    return (
      <section className="catalog section-padding">
        <div className="container">
          <div className="catalog-empty">
            <FaCreditCard className="empty-icon" />
            <h2>გადამისამართება ბანკის გვერდზე...</h2>
            <p>
              თუ გვერდი არ გაიხსნა, <a href={state.url}>დააჭირეთ აქ</a>.
            </p>
          </div>
        </div>
      </section>
    );
  }

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

            <Summary variant="mobile" promo={promo} zone={zone} />

            {state.status === "error" && (
              <p className="co-alert" role="alert">
                {state.message}
              </p>
            )}

            <div className="co-section">
              <h2>საკონტაქტო ინფორმაცია</h2>
              <div className="co-row">
                <Field id="name" label="სახელი და გვარი" error={errors.name}>
                  <input id="name" name="name" autoComplete="name" defaultValue={typed.name} required {...aria("name")} />
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
                      defaultValue={typed.phone}
                      required
                      {...aria("phone")}
                    />
                  </div>
                </Field>
              </div>
              <Field id="email" label="ელ-ფოსტა" error={errors.email} optional>
                <input id="email" name="email" type="email" autoComplete="email" inputMode="email" defaultValue={typed.email} {...aria("email")} />
              </Field>
            </div>

            <div className="co-section">
              <h2>მიწოდება</h2>
              <div className={`co-pay co-zones${errors.zone ? " has-error" : ""}`} role="radiogroup" aria-label="მიწოდების ზონა">
                {deliveryZones.map((z) => {
                  const Icon = zoneIcons[z.id];
                  return (
                    <label key={z.id} className="co-pay-option">
                      {/* uncontrolled: after React resets the form on an error, it falls back to the chosen zone */}
                      <input type="radio" name="zone" value={z.id} defaultChecked={zone === z.id} onChange={() => setZone(z.id)} required />
                      <span className="co-pay-card">
                        <span className="co-pay-icon" aria-hidden>
                          <Icon />
                        </span>
                        <strong>
                          {z.label}
                          <span className="co-zone-price">{shipText(deliveryCost(items, z.id))}</span>
                        </strong>
                        <small>{z.hint}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
              {errors.zone && <p className="co-error">{errors.zone}</p>}
              <Field id="address" label="მისამართი" error={errors.address}>
                <input
                  id="address"
                  name="address"
                  autoComplete="street-address"
                  placeholder={zone === "regions" ? "ქალაქი ან სოფელი, ქუჩა, სახლი" : "ქუჩა, სახლი, ბინა"}
                  defaultValue={typed.address}
                  required
                  {...aria("address")}
                />
              </Field>
              <Field id="comment" label="კომენტარი კურიერისთვის" optional>
                <textarea id="comment" name="comment" rows={2} placeholder="მაგ. სადარბაზოს კოდი" defaultValue={typed.comment} />
              </Field>
            </div>

            <div className="co-section">
              <h2>გადახდა</h2>
              <div className="co-pay co-pay-list" role="radiogroup" aria-label="გადახდის მეთოდი">
                {methods.map((m, i) => {
                  const Icon = payIcons[m.id];
                  return (
                    <label key={m.id} className="co-pay-option">
                      <input type="radio" name="payment" value={m.id} defaultChecked={typed.payment ? typed.payment === m.id : i === 0} />
                      <span className="co-pay-card">
                        <span className="co-pay-icon" aria-hidden>
                          {m.id === "card" ? (
                            <img src="/brand/bog-lion.png" alt="" width={29} height={24} className="co-pay-logo" />
                          ) : m.id === "installment" || m.id === "split" ? (
                            <span className="co-pay-tbc">tbc</span>
                          ) : (
                            <Icon />
                          )}
                        </span>
                        <span className="co-pay-text">
                          <strong>{m.label}</strong>
                          <small>{m.hint}</small>
                        </span>
                        <span className="co-pay-radio" aria-hidden />
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
              <p className="co-agree">
                შეკვეთის დადასტურებით ეთანხმებით <Link href="/terms">წესებსა და პირობებს</Link> და{" "}
                <Link href="/privacy">კონფიდენციალურობის პოლიტიკას</Link>.
              </p>
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
            <Summary variant="panel" promo={promo} zone={zone} />
          </aside>
        </form>
      </div>
    </section>
  );
}
