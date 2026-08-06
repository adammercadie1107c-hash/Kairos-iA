import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions d'utilisation — Kairos iA",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <article className="mx-auto max-w-2xl space-y-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-600">
            Kairos iA
          </p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            Conditions d&apos;utilisation
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Dernière mise à jour : 6 août 2026
          </p>
        </header>

        <Section title="1. Objet">
          <p>
            Les présentes conditions régissent l&apos;utilisation de la plateforme Kairos iA, un
            service SaaS d&apos;automatisation des conversations Instagram par intelligence artificielle
            destiné aux professionnels du coaching (nutrition, sport, bien-être).
          </p>
        </Section>

        <Section title="2. Inscription et compte">
          <p>
            L&apos;utilisateur doit créer un compte pour accéder au service. Il s&apos;engage à fournir des
            informations exactes et à maintenir la confidentialité de ses identifiants. Tout usage
            du service sous ses identifiants est présumé fait par l&apos;utilisateur.
          </p>
        </Section>

        <Section title="3. Description du service">
          <p>Kairos iA permet à l&apos;utilisateur de :</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Connecter un compte Instagram professionnel via le protocole OAuth de Meta.</li>
            <li>Configurer un agent IA qui répond automatiquement aux messages Instagram.</li>
            <li>Qualifier les prospects via des questions personnalisables.</li>
            <li>Gérer les conversations, relances et prospects depuis un tableau de bord.</li>
          </ul>
        </Section>

        <Section title="4. Obligations de l'utilisateur">
          <p>L&apos;utilisateur s&apos;engage à :</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Disposer d&apos;un compte Instagram professionnel (Business ou Creator) lié à une Page Facebook.</li>
            <li>Respecter les conditions d&apos;utilisation de la plateforme Meta.</li>
            <li>Ne pas utiliser le service pour envoyer du spam ou du contenu illicite.</li>
            <li>Informer ses prospects que les réponses peuvent être générées par une intelligence artificielle.</li>
          </ul>
        </Section>

        <Section title="5. Données et vie privée">
          <p>
            Le traitement des données personnelles est décrit dans notre{" "}
            <a href="/privacy" className="text-purple-600 hover:underline">
              Politique de confidentialité
            </a>
            . En utilisant le service, l&apos;utilisateur accepte ce traitement.
          </p>
        </Section>

        <Section title="6. Propriété intellectuelle">
          <p>
            Le service Kairos iA, son code source, son interface et sa documentation sont la
            propriété de Kairos iA. L&apos;utilisateur conserve la propriété de ses données et du
            contenu de ses conversations.
          </p>
        </Section>

        <Section title="7. Limitation de responsabilité">
          <p>
            Kairos iA s&apos;efforce de fournir un service fiable mais ne garantit pas que les réponses
            générées par l&apos;IA seront toujours exactes ou appropriées. L&apos;utilisateur reste
            responsable de la supervision de son agent IA et des interactions avec ses prospects.
          </p>
          <p className="mt-2">
            Kairos iA ne peut être tenu responsable des décisions prises par les prospects sur la
            base des réponses automatiques, ni des interruptions de service liées à Meta ou aux
            sous-traitants techniques.
          </p>
        </Section>

        <Section title="8. Résiliation">
          <p>
            L&apos;utilisateur peut cesser d&apos;utiliser le service à tout moment en déconnectant ses
            canaux et en demandant la suppression de son compte. Kairos iA se réserve le droit de
            suspendre un compte en cas de violation des présentes conditions.
          </p>
        </Section>

        <Section title="9. Modifications">
          <p>
            Kairos iA peut modifier ces conditions. Les utilisateurs seront informés de tout
            changement substantiel. La poursuite de l&apos;utilisation du service après notification
            vaut acceptation des nouvelles conditions.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            <strong>Kairos iA</strong>
            <br />
            E-mail :{" "}
            <a
              href="mailto:adam.mercadie1107c@gmail.com"
              className="text-purple-600 hover:underline"
            >
              adam.mercadie1107c@gmail.com
            </a>
          </p>
        </Section>

        <footer className="border-t border-gray-200 pt-6 text-sm text-gray-400">
          Droit applicable : droit français. Juridiction compétente : tribunaux de Paris.
        </footer>
      </article>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="mt-2 text-sm text-gray-600 leading-relaxed">{children}</div>
    </section>
  );
}
