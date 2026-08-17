import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "./_landing/navbar";
import { Hero } from "./_landing/hero";
import { Problems } from "./_landing/problems";
import { Target } from "./_landing/target";
import { HowItWorks } from "./_landing/how-it-works";
import { AiSection } from "./_landing/ai-section";
import { Product } from "./_landing/product";
import { Transparency } from "./_landing/transparency";
import { PilotProgram } from "./_landing/pilot-program";
import { PilotForm } from "./_landing/pilot-form";
import { Faq } from "./_landing/faq";
import { Footer } from "./_landing/footer";

export const metadata: Metadata = {
  title: "Kairos AI — Ne perdez plus vos prospects dans vos DM Instagram",
  description:
    "CRM intelligent pour coachs en nutrition. Kairos centralise vos conversations, qualifie vos prospects par IA et planifie vos relances automatiquement.",
  openGraph: {
    title: "Kairos AI — Ne perdez plus vos prospects dans vos DM Instagram",
    description:
      "CRM intelligent pour coachs en nutrition. Kairos centralise vos conversations, qualifie vos prospects par IA et planifie vos relances automatiquement.",
    type: "website",
  },
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthenticated = !!user;

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar isAuthenticated={isAuthenticated} />
      <main>
        <Hero />
        <Problems />
        <Target />
        <HowItWorks />
        <AiSection />
        <Product />
        <Transparency />
        <PilotProgram />
        <PilotForm />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}
