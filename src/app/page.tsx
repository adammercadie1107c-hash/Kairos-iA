import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "./_landing/navbar";
import { Hero } from "./_landing/hero";
import { Problem } from "./_landing/problem";
import { Flow } from "./_landing/flow";
import { Features } from "./_landing/features";
import { Control } from "./_landing/control";
import { Crm } from "./_landing/crm";
import { HowItWorks } from "./_landing/how-it-works";
import { BetaCta } from "./_landing/beta-cta";
import { Faq } from "./_landing/faq";
import { Footer } from "./_landing/footer";

export const metadata: Metadata = {
  title: "Kairos AI — Transforme tes DM Instagram en clients",
  description:
    "Le setter IA conçu pour les coachs en nutrition. Kairos répond, qualifie et relance automatiquement tes prospects Instagram jusqu'à la prise de rendez-vous.",
  openGraph: {
    title: "Kairos AI — Transforme tes DM Instagram en clients",
    description:
      "Le setter IA conçu pour les coachs en nutrition. Kairos répond, qualifie et relance automatiquement tes prospects Instagram jusqu'à la prise de rendez-vous.",
    type: "website",
  },
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Hero />
        <Problem />
        <Flow />
        <Features />
        <Control />
        <Crm />
        <HowItWorks />
        <BetaCta />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}
