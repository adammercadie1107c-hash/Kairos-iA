import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <Link
            href="/"
            className="text-base font-bold text-gray-900"
          >
            Kairos{" "}
            <span className="bg-gradient-to-r from-violet-600 to-violet-500 bg-clip-text text-transparent">
              AI
            </span>
          </Link>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
            <Link href="/privacy" className="hover:text-gray-700">
              Confidentialité
            </Link>
            <Link href="/terms" className="hover:text-gray-700">
              Conditions
            </Link>
            <Link href="/login" className="hover:text-gray-700">
              Connexion
            </Link>
          </nav>
        </div>
        <p className="mt-8 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Kairos AI. Tous droits
          réservés.
        </p>
      </div>
    </footer>
  );
}
