"use client";

import { createContext, useContext } from "react";
import { defaultSiteSettings, type SiteSettings } from "@/lib/data";

// Contact details from the admin, provided once by the storefront layout.
const Ctx = createContext<SiteSettings>(defaultSiteSettings);

export function SiteSettingsProvider({ value, children }: { value: SiteSettings; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSiteSettings = () => useContext(Ctx);
