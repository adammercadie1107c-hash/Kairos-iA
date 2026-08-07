import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Kairos iA",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <article className="mx-auto max-w-2xl space-y-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-600">
            Kairos iA
          </p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            Politique de confidentialité
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Dernière mise à jour : 6 août 2026
          </p>
        </header>

        <p className="text-gray-600 leading-relaxed">
          Kairos iA (&laquo;&nbsp;nous&nbsp;&raquo;, &laquo;&nbsp;notre&nbsp;&raquo;) est une
          plateforme SaaS qui aide les coachs en nutrition et coachs sportifs à automatiser la
          gestion de leurs conversations Instagram grâce à l&apos;intelligence artificielle. La
          présente politique décrit comment nous collectons, utilisons et protégeons les données
          personnelles dans le cadre de notre service.
        </p>

        <Section title="1. Données collectées">
          <p>Nous collectons les catégories de données suivantes :</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Données de compte</strong> — nom, adresse e-mail et mot de passe fournis lors
              de l&apos;inscription.
            </li>
            <li>
              <strong>Données Instagram</strong> — lorsqu&apos;un utilisateur connecte son compte
              Instagram professionnel via Meta, nous recevons un jeton d&apos;accès à la Page, l&apos;identifiant
              du compte Instagram professionnel et le nom d&apos;utilisateur Instagram. Ces données sont
              stockées exclusivement côté serveur.
            </li>
            <li>
              <strong>Messages</strong> — le contenu des messages échangés entre les prospects et le
              compte Instagram de l&apos;utilisateur, nécessaires au fonctionnement de l&apos;agent IA.
            </li>
            <li>
              <strong>Données de prospects</strong> — les informations communiquées volontairement
              par les prospects dans la conversation (nom, e-mail, téléphone, objectifs).
            </li>
            <li>
              <strong>Données d&apos;utilisation</strong> — journaux techniques (horodatages, nombre de
              tokens, latence) pour le bon fonctionnement du service.
            </li>
          </ul>
        </Section>

        <Section title="2. Utilisation des données">
          <p>Les données collectées sont utilisées pour :</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Répondre automatiquement aux messages Instagram via l&apos;agent IA.</li>
            <li>Qualifier les prospects en extrayant les informations pertinentes de la conversation.</li>
            <li>Planifier des relances automatiques.</li>
            <li>Synchroniser les prospects qualifiés dans le CRM intégré.</li>
            <li>Améliorer la fiabilité et les performances du service.</li>
          </ul>
          <div className="mt-4 rounded-r-md border-l-[3px] border-purple-500 bg-purple-50 px-4 py-3">
            <p className="text-sm text-purple-900">
              Nous n&apos;utilisons jamais les données de conversation à des fins publicitaires, de
              profilage marketing ou de revente à des tiers.
            </p>
          </div>
        </Section>

        <Section title="3. Intégration Meta (Instagram)">
          <p>
            Kairos iA utilise le système Facebook Login for Business pour connecter les comptes
            Instagram professionnels. Nous demandons les permissions suivantes :
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>pages_show_list</strong> — lister les Pages Facebook gérées.</li>
            <li><strong>instagram_basic</strong> — accéder au profil Instagram lié.</li>
            <li><strong>instagram_manage_messages</strong> — lire et envoyer des messages Instagram.</li>
            <li><strong>pages_manage_metadata</strong> — abonner la Page aux notifications de messages.</li>
          </ul>
          <p className="mt-2">
            L&apos;utilisateur peut révoquer cet accès à tout moment depuis la page Canaux de
            l&apos;application ou depuis les paramètres de son compte Facebook.
          </p>
        </Section>

        <Section title="4. Stockage et sécurité">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Les données sont hébergées sur <strong>Supabase</strong> (infrastructure cloud
              sécurisée, chiffrement au repos et en transit).
            </li>
            <li>
              Les jetons d&apos;accès Meta sont stockés uniquement côté serveur et ne sont jamais
              exposés au navigateur.
            </li>
            <li>Les webhooks entrants sont vérifiés par signature HMAC-SHA256.</li>
            <li>L&apos;accès aux données est isolé par utilisateur (Row Level Security).</li>
          </ul>
        </Section>

        <Section title="5. Partage des données">
          <p>
            Nous ne vendons ni ne partageons les données personnelles, sauf dans les cas suivants :
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Sous-traitants techniques</strong> — Supabase (hébergement), Anthropic
              (traitement IA des conversations), Vercel (hébergement applicatif). Ces sous-traitants
              sont liés par des engagements de confidentialité.
            </li>
            <li><strong>Obligation légale</strong> — si la loi l&apos;exige.</li>
          </ul>
        </Section>

        <Section title="6. Conservation des données">
          <p>
            Les données de conversation et de prospects sont conservées tant que le compte
            utilisateur est actif. L&apos;utilisateur peut demander la suppression de son compte et de
            toutes les données associées en nous contactant.
          </p>
          <p className="mt-2">
            Lors de la déconnexion d&apos;un canal Instagram, les jetons d&apos;accès sont immédiatement
            supprimés. L&apos;historique des conversations est conservé sauf demande explicite de
            suppression.
          </p>
        </Section>

        <Section title="7. Droits des utilisateurs">
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Accès</strong> — obtenir une copie de vos données personnelles.</li>
            <li><strong>Rectification</strong> — corriger des données inexactes.</li>
            <li><strong>Suppression</strong> — demander l&apos;effacement de vos données.</li>
            <li><strong>Portabilité</strong> — recevoir vos données dans un format structuré.</li>
            <li><strong>Opposition</strong> — vous opposer au traitement de vos données.</li>
          </ul>
          <p className="mt-2">
            Pour exercer ces droits, contactez-nous à l&apos;adresse ci-dessous.
          </p>
        </Section>

        <Section title="8. Suppression des données">
          <p>
            Conformément aux exigences de la plateforme Meta, Kairos iA offre un mécanisme de
            suppression des données. Tout utilisateur peut demander la suppression complète de ses
            données en envoyant un e-mail à l&apos;adresse de contact. Les données seront supprimées dans
            un délai de 30 jours.
          </p>
        </Section>

        <Section title="9. Modifications">
          <p>
            Nous pouvons modifier cette politique. En cas de changement substantiel, les utilisateurs
            seront informés par e-mail ou via l&apos;application. La date de dernière mise à jour est
            indiquée en haut de cette page.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            Pour toute question concernant cette politique de confidentialité ou vos données
            personnelles :
          </p>
          <p className="mt-2">
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
          Cette politique de confidentialité est conforme au Règlement Général sur la Protection des
          Données (RGPD) et aux exigences de la plateforme Meta pour les applications utilisant
          l&apos;API Instagram.
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
