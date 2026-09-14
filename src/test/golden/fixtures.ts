// src/test/golden/fixtures.ts
//
// VCR-style recorded fixtures for the golden-set pipeline test
// (src/test/golden/pipeline.e2e.test.ts). These aren't fabricated to be
// conveniently parseable — they're shaped like what the real providers
// actually return (GNews's `articles[]` JSON envelope; a news article page
// with the usual nav/ad/cookie-banner boilerplate around the real content;
// NVIDIA's structured-output JSON), so the *real* parsing code
// (SearchService, extractor.ts's Readability pipeline, the debate route's
// response mapping) runs against something representative of production
// input instead of a hand-simplified stub.

export const ORIGINAL_ARTICLE_URL = "https://example-news.test/world/vaccination-campaign-launch";

export const ORIGINAL_ARTICLE_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Ministry Launches Nationwide Vaccination Campaign | Example News</title>
  <meta name="author" content="Jordan Ellis">
  <meta property="article:published_time" content="2026-02-18T09:00:00.000Z">
</head>
<body>
  <header class="header"><nav class="navbar"><a href="/world">World</a><a href="/health">Health</a><a href="/sport">Sport</a></nav></header>
  <div class="cookie-banner">We use cookies to improve your experience. <button>Accept</button></div>
  <div class="ad">Advertisement — Sponsored content</div>
  <article>
    <h1>Ministry Launches Nationwide Vaccination Campaign</h1>
    <p class="byline">By Jordan Ellis — Published February 18, 2026</p>
    <p>The Ministry of Health announced on Wednesday that a nationwide vaccination campaign will begin on March 1st, targeting communities that have historically had lower immunization coverage. The announcement was made at a press briefing in the capital, where the health minister outlined the logistics of the rollout.</p>
    <p>Officials confirmed that more than two million doses will be distributed in the first phase of the campaign, with mobile clinics dispatched to rural districts starting in the second week of March. The ministry said additional doses would follow in subsequent phases depending on demand and supply chain capacity.</p>
    <p>Health experts have welcomed the initiative, noting that regional vaccination rates have lagged behind the national average for the past two years. Independent public health researchers said the plan, if executed as described, would represent one of the largest coordinated vaccination pushes the country has undertaken.</p>
  </article>
  <div class="related-stories">Related: Health budget increased for next fiscal year</div>
  <footer class="footer">© 2026 Example News Network. All rights reserved.</footer>
</body>
</html>`;

export const CLAIM_1 = "The Ministry of Health announced a nationwide vaccination campaign starting March 1st.";
export const CLAIM_2 = "More than two million vaccine doses will be distributed in the first phase of the campaign.";

/** Recorded shape of the NVIDIA structured-output response for the 'Extract' caller. */
export const NVIDIA_EXTRACT_RESPONSE = {
  object: {
    claims: [CLAIM_1, CLAIM_2],
  },
  modelUsed: "nvidia/nemotron-3-ultra-550b-a55b",
};

export const REUTERS_URL = "https://reuters.com/world/health/vaccination-campaign-confirmed-2026";
export const APNEWS_URL = "https://apnews.com/article/vaccination-campaign-ministry-health-launch";

function corroboratingArticleHtml(opts: { headline: string; byline: string; published: string; body: string[] }) {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>${opts.headline}</title></head>
<body>
  <header class="header"><nav class="navbar"><a href="/world">World</a><a href="/politics">Politics</a></nav></header>
  <div class="cookie-consent">This site uses cookies. <button>OK</button></div>
  <article>
    <h1>${opts.headline}</h1>
    <p class="byline">${opts.byline} — ${opts.published}</p>
    ${opts.body.map((p) => `<p>${p}</p>`).join("\n    ")}
  </article>
  <aside class="sidebar trending">Trending: Other unrelated stories</aside>
  <footer class="footer">All rights reserved.</footer>
</body>
</html>`;
}

export const REUTERS_ARTICLE_HTML = corroboratingArticleHtml({
  headline: "Health Ministry Confirms March Vaccination Drive",
  byline: "By Amara Chen, Reuters",
  published: "Feb 19, 2026",
  body: [
    "The health ministry confirmed Thursday that its nationwide vaccination campaign will launch on March 1, with an initial allocation of more than two million doses aimed at underserved regions.",
    "A ministry spokesperson said mobile vaccination units would begin reaching rural districts within the campaign's first two weeks, and that the government had secured supply agreements to support later phases of the rollout.",
    "Independent analysts said the scale of the initial phase was larger than similar campaigns launched in neighboring countries over the past year.",
  ],
});

export const APNEWS_ARTICLE_HTML = corroboratingArticleHtml({
  headline: "Nationwide Immunization Push Set to Begin March 1",
  byline: "By Daniel Okafor, AP",
  published: "February 19, 2026",
  body: [
    "Government health officials said Thursday that a nationwide immunization campaign, first announced earlier this week, will formally begin on March 1 with more than two million doses ready for distribution.",
    "The rollout will prioritize regions with historically low vaccination coverage, according to officials who briefed reporters on the plan's logistics on condition of background attribution.",
    "Public health researchers described the campaign as one of the most ambitious immunization efforts the country has attempted in recent years.",
  ],
});

/** Recorded shape of a GNews API (`https://gnews.io/api/v4/search`) response envelope. */
export function gnewsResponseFor(query: string) {
  return {
    totalArticles: 2,
    articles: [
      {
        title: "Health Ministry Confirms March Vaccination Drive",
        description: "The health ministry confirmed its nationwide vaccination campaign will launch on March 1.",
        content: "The health ministry confirmed Thursday that its nationwide vaccination campaign will launch on March 1...",
        url: REUTERS_URL,
        image: "https://reuters.com/images/vaccination-campaign.jpg",
        publishedAt: "2026-02-19T07:30:00Z",
        source: { name: "Reuters", url: "https://reuters.com" },
      },
      {
        title: "Nationwide Immunization Push Set to Begin March 1",
        description: "A nationwide immunization campaign will formally begin on March 1 with over two million doses ready.",
        content: "Government health officials said Thursday that a nationwide immunization campaign will formally begin on March 1...",
        url: APNEWS_URL,
        image: "https://apnews.com/images/immunization-push.jpg",
        publishedAt: "2026-02-19T08:15:00Z",
        source: { name: "AP News", url: "https://apnews.com" },
      },
    ],
    _queryEcho: query,
  };
}

/** Recorded shapes of the NVIDIA structured-output responses for each debate agent. */
export const NVIDIA_DEBATE_RESPONSES: Record<string, any> = {
  DebateSupport: {
    object: {
      supportingArguments: [
        "Both Reuters and AP independently confirm the March 1 start date and the two-million-dose first phase.",
        "Official government briefings are cited as the source in both corroborating reports.",
      ],
      confidenceInSupport: 88,
    },
  },
  DebateOpposition: {
    object: {
      contradictingArguments: [],
      confidenceInOpposition: 8,
    },
  },
  DebateContext: {
    object: {
      contextualFactors: ["Coverage is consistent across two independent wire services published within a day of each other."],
      temporalRelevance: "The campaign start date is a near-future, specific commitment rather than a vague timeline.",
    },
  },
  DebateTemporal: {
    object: {
      temporalStatus: "CURRENTLY_VALID",
      analysis: "All sources describe the same upcoming March 1 launch with no indication the plan has changed or lapsed.",
    },
  },
  DebateJudge: {
    object: {
      verdict: "MOSTLY_TRUE",
      explanation: "Two independent, high-credibility wire services corroborate the campaign's launch date and initial dose count, with no contradicting evidence found.",
      agentAgreementScore: 0.9,
      sourceStances: [
        { sourceUrl: REUTERS_URL, stance: "SUPPORTS" },
        { sourceUrl: APNEWS_URL, stance: "SUPPORTS" },
      ],
      injectionAttemptDetected: false,
    },
  },
};
