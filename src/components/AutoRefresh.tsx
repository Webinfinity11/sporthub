"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-renders the server page every `every` ms, at most `times` times (while a payment is still processing). */
export default function AutoRefresh({ every = 3000, times = 20 }: { every?: number; times?: number }) {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      if (++n > times) return clearInterval(id);
      router.refresh();
    }, every);
    return () => clearInterval(id);
  }, [router, every, times]);
  return null;
}
