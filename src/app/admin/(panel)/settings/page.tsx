import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { db, siteSettings } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { defaultSiteSettings } from "@/lib/data";
import SettingsForm from "./SettingsForm";

export const instant = false;

export const metadata: Metadata = { title: "კონტაქტები" };

export default async function SettingsPage() {
  await requireAdmin();
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.id, 1)).limit(1);
  const s = row ?? defaultSiteSettings;
  return (
    <SettingsForm
      settings={{
        phones: s.phones,
        addresses: s.addresses,
        email: s.email,
        hours: s.hours,
        facebook: s.facebook,
        instagram: s.instagram,
        tiktok: s.tiktok,
      }}
    />
  );
}
