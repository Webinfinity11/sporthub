"use client";

import { useEffect, useState } from "react";
import { FaAngleUp } from "react-icons/fa";

export default function ScrollToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 200);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      className={`scroll-to-top${show ? " show" : ""}`}
      aria-label="ზემოთ ასვლა"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <FaAngleUp />
    </button>
  );
}
