import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

// Single-admin auth: ADMIN_USERNAME + ADMIN_PASSWORD, session = signed, expiring cookie.
export const SESSION_COOKIE = "sh_admin";
const SESSION_DAYS = 7;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set (32+ characters)");
  return s;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

const safeEqual = (a: string, b: string) => {
  // hash first so lengths always match
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
};

export function checkCredentials(username: string, password: string) {
  const expectedUser = process.env.ADMIN_USERNAME || "admin";
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedPass) throw new Error("ADMIN_PASSWORD is not set");
  // evaluate both so timing does not reveal which one was wrong
  const userOk = safeEqual(username.trim().toLowerCase(), expectedUser.toLowerCase());
  const passOk = safeEqual(password, expectedPass);
  return userOk && passOk;
}

export function createSessionToken() {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `admin.${exp}`;
  return { token: `${payload}.${sign(payload)}`, expires: new Date(exp) };
}

/** Returns why a token is invalid, or null when it is valid. */
export function sessionProblem(token: string | undefined): string | null {
  if (!token) return "no cookie";
  const i = token.lastIndexOf(".");
  if (i < 0) return "malformed";
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  const exp = Number(payload.split(".")[1]);
  if (!Number.isFinite(exp)) return "malformed";
  if (exp < Date.now()) return "expired";
  return safeEqual(sig, sign(payload)) ? null : "bad signature";
}

export function verifySessionToken(token: string | undefined) {
  return sessionProblem(token) === null;
}

export async function isAdmin() {
  await connection(); // request-time only (expiry check uses the current time)
  const jar = await cookies();
  const problem = sessionProblem(jar.get(SESSION_COOKIE)?.value);
  if (problem && process.env.NODE_ENV !== "production") {
    const names = jar.getAll().map((c) => c.name);
    console.warn(`[admin-auth] page check failed: ${problem}; cookies sent: ${names.join(", ") || "none"}`);
  }
  return problem === null;
}

/** Use at the top of every admin page and server action. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
