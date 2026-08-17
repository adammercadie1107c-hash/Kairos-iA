"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function CtaButton({
  href,
  location,
  children,
  className,
}: {
  href: string;
  location: string;
  children: ReactNode;
  className?: string;
}) {
  function handleClick() {
    trackEvent("landing_cta_clicked", {
      location,
      destination: href.startsWith("#") ? "application_form" : href,
    });
  }

  const styles = cn(
    "inline-flex items-center justify-center rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600",
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
