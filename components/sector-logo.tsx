"use client";

import { useState } from "react";
import { SITE } from "@/lib/site";

export default function SectorLogo({
  className = "h-12 w-12",
}: {
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={`${className} relative flex shrink-0 items-center justify-center overflow-hidden rounded-[22px] border border-[rgba(213,166,116,.24)] bg-[linear-gradient(145deg,rgba(213,166,116,.10),rgba(255,255,255,.025))] shadow-[inset_0_1px_0_rgba(255,255,255,.05),0_18px_45px_rgba(0,0,0,.25)]`}
      aria-label="شعار الأمن الدبلوماسي"
    >
      {!failed ? (
        <img
          src={`${SITE.logo}?v=58`}
          alt="شعار الأمن الدبلوماسي"
          draggable={false}
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full select-none object-contain p-1"
          style={{ imageRendering: "auto" }}
        />
      ) : (
        <span className="px-2 text-center text-[9px] font-black leading-3 bronze-text">
          ضع الشعار
        </span>
      )}
      <span className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  );
}
