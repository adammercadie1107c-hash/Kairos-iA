"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { CtaButton } from "./cta-button";

export function Navbar({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 10);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function handleLoginClick() {
    trackEvent("landing_login_clicked", {
      location: "navbar",
      destination: "login",
    });
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-gray-950/95 shadow-lg shadow-black/20 backdrop-blur-sm"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg font-bold text-white"
        >
          Kairos
          <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-violet-400 uppercase">
            Pilote
          </span>
        </Link>

        <div className="hidden items-center gap-4 md:flex">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-400 transition-colors hover:text-white"
            >
              Mon espace
            </Link>
          ) : (
            <Link
              href="/login"
              onClick={handleLoginClick}
              className="text-sm font-medium text-gray-400 transition-colors hover:text-white"
            >
              Se connecter
            </Link>
          )}
          <CtaButton href="#candidature" location="navbar">
            Rejoindre le programme pilote
          </CtaButton>
        </div>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-gray-400 hover:bg-gray-800 hover:text-white md:hidden"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-800/60 bg-gray-950 px-4 pb-4 pt-2 md:hidden">
          <div className="space-y-1">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-900"
              >
                Mon espace
              </Link>
            ) : (
              <Link
                href="/login"
                onClick={() => {
                  setOpen(false);
                  handleLoginClick();
                }}
                className="block rounded-md px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-900"
              >
                Se connecter
              </Link>
            )}
          </div>
          <div className="mt-3 border-t border-gray-800/60 pt-3">
            <CtaButton
              href="#candidature"
              location="navbar"
              className="w-full"
            >
              Rejoindre le programme pilote
            </CtaButton>
          </div>
        </div>
      )}
    </header>
  );
}
