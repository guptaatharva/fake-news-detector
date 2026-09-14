import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/ui/Footer";

export const metadata = {
  title: "Privacy Policy — VeraCius AI",
};

// §9.3: the app collects accounts, saves user-submitted text/URLs and
// analysis history, and uses a Supabase service-role key server-side — a
// public-facing tool handling user-submitted content should state data
// retention/usage clearly. This is a plain-language draft, not legal
// advice — have it reviewed before relying on it for a real deployment.

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="font-display text-lg font-bold text-foreground mb-2">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-graphite-bg">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-display text-3xl md:text-4xl font-black text-foreground mb-2">Privacy Policy</h1>
        <p className="text-xs text-muted-foreground font-mono mb-10">
          Draft — informational only, not legal advice. Have this reviewed by counsel before relying on it for a public launch.
        </p>

        <Section title="What we collect">
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Account info: email address and display name, via Supabase Auth.</li>
            <li>Submitted content: the URLs or text you submit for analysis, and the resulting verdicts, claims, and evidence.</li>
            <li>Basic technical data (IP address) used only for rate-limiting and abuse prevention, not stored long-term.</li>
          </ul>
        </Section>

        <Section title="What we don't collect">
          <p>We don't sell your data, run third-party advertising trackers, or share submitted content with anyone beyond the AI/search providers strictly necessary to produce your analysis (see below).</p>
        </Section>

        <Section title="Third parties involved in producing an analysis">
          <p>
            To analyze a submission we send its text (and text scraped from linked sources) to an AI inference
            provider, and send derived search queries to third-party web search providers. Treat anything you submit
            as potentially visible to those processors.
          </p>
        </Section>

        <Section title="Data retention">
          <p>
            Saved analyses remain in your account history until you delete them or delete your account. Deleting
            your account removes your saved analyses and profile data.
          </p>
        </Section>

        <Section title="Your controls">
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>You can delete any saved analysis from your history.</li>
            <li>You can delete your account entirely from your profile page — this permanently removes your account and analysis history.</li>
            <li>You control whether an individual analysis is shared publicly via its "Make public" link.</li>
          </ul>
        </Section>

        <Section title="Security">
          <p>
            Server-side credentials (including the Supabase service-role key) are never exposed to the browser.
            Analysis endpoints are rate-limited and gated behind sign-in to reduce abuse.
          </p>
        </Section>

        <Section title="Contact">
          <p>Questions about this policy or a request to delete your data can be made from your account settings, or by contacting the site operator.</p>
        </Section>
      </main>
      <Footer />
    </div>
  );
}
