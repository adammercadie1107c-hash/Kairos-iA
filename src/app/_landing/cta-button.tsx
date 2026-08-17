"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function CtaButton({
  href,
  location,
  variant = "primary",
  children,
  className,
}: {
  href: string;
  location: string;
  variant?: "primary" | "secondary";
  children: ReactNode;
  className?: string;
}) {
  const isPrimary = variant === "primary";

  function handleClick() {
    trackEvent(
      isPrimary ? "landing_cta_clicked" : "landing_secondary_cta_clicked",
      { location, destination: href.startsWith("#") ? href : "signup" },
    );
  }

  const styles = cn(
    "inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
    isPrimary
      ? "bg-violet-600 text-white hover:bg-violet-700 focus-visible:outline-violet-600"
      : "border border-gray-300 text-gray-700 hover:bg-gray-50 focus-visible:outline-gray-400",
    className,
  );

  if (href.startsWith("#")) {
    return (
      <a href={href} onClick={handleClick} className={styles}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} onClick={handleClick} className={styles}>
      {children}
    </Link>
  );
}
