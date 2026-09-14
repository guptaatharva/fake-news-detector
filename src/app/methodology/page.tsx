import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/ui/Footer";
import { AlertTriangle, Bot, ShieldQuestion, Flag, FlaskConical } from "lucide-react";

export const metadata = {
  title: "Methodology & Limitations — VeraCius AI",
};

// §9.1: a clear methodology/limitations page — what the AI can and can't do,
// that verdicts are AI-generated and can be wrong, how sources are chosen,
// and how users can report a bad verdict.

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-display text-xl font-bold text-foreground mb-3">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-graphite-bg">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-display text-3xl md:text-4xl font-black text-foreground mb-4">
          Methodology &amp; Limitations
        </h1>
        <p className="text-sm text-muted-foreground mb-12">
          How VeraCius reaches a verdict, what it can and can't do, and how to report a result that looks wrong.
        </p>

        <div className="flex items-start gap-3 p-4 rounded-2xl bg-neonRed/10 border border-neonRed/30 mb-12">
          <AlertTriangle className="w-5 h-5 text-neonRed shrink-0 mt-0.5" />
          <p className="text-sm text-foreground leading-relaxed">
            <strong>Every verdict on this site is AI-generated and can be wrong.</strong> Treat it as a research aid
            that surfaces evidence quickly, not as a final authority. For anything consequential, follow the source
            links and verify independently.
          </p>
        </div>

        <Section title="How an analysis works">
          <p>Submitting a URL or a block of text runs it through four stages:</p>
          <ol className="list-decimal list-inside space-y-1 pl-2">
            <li><strong>Claim extraction</strong> — a language model breaks the input into 10–15 atomic, checkable factual assertions.</li>
            <li><strong>Evidence gathering</strong> — each claim is independently searched across live web providers, and up to three resulting pages are scraped for their actual article text.</li>
            <li><strong>Multi-agent debate</strong> — for every claim, four independent AI agents argue from that evidence: a Support agent looks only for corroboration, an Opposition agent looks only for contradiction, a Context agent looks for missing nuance or misleading framing, and a Temporal agent checks whether the claim is being presented as current when the evidence is actually old. A Judge agent weighs all four and reaches a verdict.</li>
            <li><strong>Deterministic scoring</strong> — the confidence percentage is <em>not</em> a number the model invents. It's computed from four measured factors: the credibility of the domains used (35%), how much of the gathered evidence actually aligns with the reached verdict (25%), how much the four debate agents agreed with each other (25%), and how recent the evidence is (15%).</li>
          </ol>
        </Section>

        <Section title="How source credibility is decided">
          <p>
            Each source's credibility rating comes from a fixed domain-authority formula — known wire services and
            major outlets score higher than an unrecognized blog — combined with small, honest adjustments for
            whether the article has an identifiable byline and how recently it was published. It is not the AI's own
            subjective impression of how trustworthy a page "sounds."
          </p>
          <p>
            A verdict backed by only one independent domain is flagged as low source diversity and its confidence is
            capped — a single echo of one source is treated as weaker evidence than multiple independent outlets
            agreeing.
          </p>
        </Section>

        <Section title="How accurate is it? (real evaluation results)">
          <div className="flex items-start gap-3 mb-3">
            <FlaskConical className="w-4 h-4 text-neonRed shrink-0 mt-0.5" />
            <p>
              Two hand-picked evaluation sets exist, both run through the actual live pipeline (real web search,
              real scraping, real AI debate agents, no shortcuts), with every verdict checked by hand. For a real
              comparison, the same gathered evidence was also run through a single non-debate AI call (one shot, no
              agent structure) as a baseline. Scripts and full raw results are public in the repository:{" "}
              <code className="text-xs bg-graphite-bg px-1.5 py-0.5 rounded border border-graphite-border">
                scripts/manual/eval-accuracy*.ts
              </code>{" "}
              /{" "}
              <code className="text-xs bg-graphite-bg px-1.5 py-0.5 rounded border border-graphite-border">
                scripts/manual/eval-results*.json
              </code>.
            </p>
          </div>

          <p className="font-semibold text-foreground">16 easy claims (clear facts, common myths, high-stakes debunked misinformation, a real satire headline)</p>
          <p>
            Debate 15/16 (94%), baseline 15/16 (94%) — <strong className="text-foreground">identical on every case</strong>,
            including the one miss both made (a real Onion headline scored as literally true instead of SATIRE,
            because the evidence mixed the original satire article with two non-satire sources reporting on it — the
            SATIRE label only fires when every piece of evidence is from a known-satire domain). On easy claims, the
            multi-agent structure showed no measurable accuracy advantage over a single call.
          </p>

          <p className="font-semibold text-foreground mt-3">8 hard claims (real, current 2026 news — a study retracted days before this set was written, real disaster statistics, a true number paired with a false conclusion, a thinly-covered filing)</p>
          <p>
            First run: <strong className="text-foreground">debate 3/8 (38%), baseline 6/8 (75%)</strong> — a real
            regression, not noise. Investigating why found two concrete bugs in the debate architecture:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>No agent was ever told today&apos;s actual date — each inferred &quot;now&quot; from its own training data. One agent&apos;s own logged reasoning proved it: it called a genuinely current, correctly-dated article a &quot;future date relative to the current year (2025)&quot; and discounted it. This affected every live analysis, not just the test.</li>
            <li>The verdict-selection guidance didn&apos;t clearly distinguish MIXTURE (a real fact paired with an unsupported conclusion) from FALSE or from MOSTLY_TRUE (correct on substance, imprecise on a minor detail) — so a claim the system&apos;s own reasoning correctly diagnosed as &quot;a factual kernel, but a decisively contradicted conclusion&quot; still got marked FALSE.</li>
          </ul>
          <p>
            Both were fixed, and re-testing the identical 8 claims — not just asserting the fix helped — confirmed
            it: the exact claim that hit the date bug now gets a correct verdict, and the exact claim that hit the
            MIXTURE bug now lands on MIXTURE correctly. <strong className="text-foreground">After the fix: debate
            6/8 (75%), baseline 5/8 (62%)</strong> — debate now ahead, with the wins directly traceable case-by-case
            to the bugs found and fixed, not just an aggregate number moving. (Live search returns slightly
            different evidence run to run, so not every point of change is purely the fix.)
          </p>
          <p>
            What the debate system does that a single call structurally can&apos;t, independent of which one gets a
            given verdict right: produce a deterministic, source-credibility-grounded confidence score and a
            per-source stance breakdown (supports / contradicts / neutral / irrelevant), rather than just a verdict
            and free text.
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            24 examples total across both sets is a real first data point, not a statistically rigorous benchmark,
            and both runs only cover English-language claims stated in text. Building a larger, adversarial
            evaluation set — and re-running it regularly to catch regressions — is open work, tracked in the
            project&apos;s <code className="bg-graphite-bg px-1 py-0.5 rounded border border-graphite-border">REMAINING.md</code>.
          </p>
        </Section>

        <Section title="What the system deliberately does NOT do">
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>It does not treat satire or parody publications (e.g. The Onion) as misinformation — known satire domains are labeled SATIRE, not FALSE.</li>
            <li>It does not analyze images, video, or audio — only text.</li>
            <li>It is strongest in English; claims in other languages, or search results dominated by non-English sources, may be less reliable.</li>
            <li>It does not consult paid fact-checking databases (e.g. NewsGuard) or licensed media-bias datasets — only the live open web.</li>
            <li>Scraped web content is treated as untrusted data during analysis, never as instructions — a manipulated page cannot talk the system into a false verdict, and any detected attempt is flagged in the report.</li>
          </ul>
        </Section>

        <Section title="Report a result">
          <div className="flex items-start gap-3">
            <Flag className="w-4 h-4 text-neonRed shrink-0 mt-0.5" />
            <p>
              If a verdict looks wrong, use the "Flag this verdict" action on the analysis report (signed-in users).
              Flagged reports are reviewed and feed directly into improving the scoring system over time.
            </p>
          </div>
        </Section>

        <Section title="Questions this page doesn't answer">
          <div className="flex items-start gap-3">
            <ShieldQuestion className="w-4 h-4 text-neonRed shrink-0 mt-0.5" />
            <p>
              For data handling, see the <a href="/privacy" className="text-neonRed hover:underline">Privacy Policy</a>.
              For usage terms, see the <a href="/terms" className="text-neonRed hover:underline">Terms of Service</a>.
            </p>
          </div>
        </Section>

        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono pt-6 border-t border-graphite-border">
          <Bot className="w-3.5 h-3.5" />
          <span>VeraCius AI — automated analysis, human judgment still required.</span>
        </div>
      </main>
      <Footer />
    </div>
  );
}
