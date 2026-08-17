"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CtaButton } from "./cta-button";

const navLinks = [
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#comment-ca-marche", label: "Comment ça marche" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 10);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 bg-white transition-shadow duration-300",
        scrolled ? "shadow-sm" : "",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-lg font-bold text-gray-900"
        >
          Kairos{" "}
          <span className="bg-gradient-to-r from-violet-600 to-violet-500 bg-clip-text text-transparent">
            AI
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
          >
            Se connecter
          </Link>
          <CtaButton
            href="/signup"
            location="navbar"
            className="px-4 py-2 text-sm"
          >
            Tester gratuitement
          </CtaButton>
        </div>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-gray-100 md:hidden"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-100 bg-white px-4 pb-4 pt-2 md:hidden">
          <nav className="space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Se connecter
            </Link>
            <CtaButton href="/signup" location="navbar" className="w-full">
              Tester gratuitement
            </CtaButton>
          </div>
        </div>
      )}
    </header>
  );
}
