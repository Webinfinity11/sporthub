const months = ["იან", "თებ", "მარ", "აპრ", "მაი", "ივნ", "ივლ", "აგვ", "სექ", "ოქტ", "ნოე", "დეკ"];
const pad = (n: number) => String(n).padStart(2, "0");

/** "16 ნოე 2026, 14:05" in Tbilisi time. */
export function fmtDate(d: Date, withTime = true) {
  // shift to Asia/Tbilisi (UTC+4, no DST) so server and admin agree
  const t = new Date(d.getTime() + 4 * 60 * 60 * 1000);
  const date = `${t.getUTCDate()} ${months[t.getUTCMonth()]} ${t.getUTCFullYear()}`;
  return withTime ? `${date}, ${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}` : date;
}

export function fmtPhone(p: string) {
  const d = p.replace(/\D/g, "").replace(/^995/, "");
  return d.length === 9 ? `${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7)}` : p;
}
