document.addEventListener('DOMContentLoaded', async () => {
  const currentUrlEl = document.getElementById('currentUrl');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const loader = document.getElementById('loader');
  const errorEl = document.getElementById('error');
  const resultsEl = document.getElementById('results');
  const scoreValue = document.getElementById('scoreValue');
  const verdictText = document.getElementById('verdictText');
  const summaryText = document.getElementById('summaryText');
  const openDashboardBtn = document.getElementById('openDashboardBtn');

  // API URL - assuming running locally for development
  const API_BASE = 'http://localhost:3000';

  let activeTabUrl = '';

  // Get current tab URL
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && tabs[0].url) {
      activeTabUrl = tabs[0].url;
      // Don't show full URL to save space
      const urlObj = new URL(activeTabUrl);
      currentUrlEl.textContent = urlObj.hostname + (urlObj.pathname.length > 20 ? urlObj.pathname.substring(0, 20) + '...' : urlObj.pathname);
    } else {
      currentUrlEl.textContent = 'Unable to read tab URL';
      analyzeBtn.disabled = true;
    }
  } catch (err) {
    currentUrlEl.textContent = 'Error accessing tab';
  }

  function openDashboardForFullAnalysis() {
    chrome.tabs.create({ url: `${API_BASE}/dashboard?url=${encodeURIComponent(activeTabUrl)}` });
  }

  openDashboardBtn.onclick = openDashboardForFullAnalysis;

  analyzeBtn.addEventListener('click', async () => {
    if (!activeTabUrl) return;

    // Reset UI
    analyzeBtn.style.display = 'none';
    resultsEl.style.display = 'none';
    errorEl.style.display = 'none';
    loader.style.display = 'block';

    try {
      // /api/analyze/* routes require a signed-in session (they're rate-limited
      // and cost real API quota per call). `credentials: 'include'` sends the
      // site's session cookie cross-origin from this extension popup — this
      // only works if the user is already signed in at API_BASE in their
      // browser.
      const extractRes = await fetch(`${API_BASE}/api/analyze/extract`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: activeTabUrl })
      });

      if (extractRes.status === 401) {
        throw new Error('Sign in at the VeraCius AI site first, then retry this quick check.');
      }
      if (!extractRes.ok) {
        const errBody = await extractRes.json().catch(() => ({}));
        throw new Error(errBody.error || 'Extraction failed');
      }
      const extractData = await extractRes.json();

      // Honest scope: this is a fast, no-evidence read of the page's own text —
      // it does NOT search the web or scrape corroborating sources. Treat it as
      // a rough triage signal only; "Run Full Verified Analysis" runs the real
      // multi-agent debate pipeline against live evidence.
      const evidenceContext = 'No external evidence gathered for this quick, evidence-free extension check.';

      const synthesizeRes = await fetch(`${API_BASE}/api/analyze/synthesize`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalText: extractData.originalText,
          evidenceContext: evidenceContext
        })
      });

      if (synthesizeRes.status === 401) {
        throw new Error('Sign in at the VeraCius AI site first, then retry this quick check.');
      }
      if (!synthesizeRes.ok) {
        const errBody = await synthesizeRes.json().catch(() => ({}));
        throw new Error(errBody.error || 'Synthesis failed');
      }
      const resultData = await synthesizeRes.json();

      // Show Results
      loader.style.display = 'none';
      resultsEl.style.display = 'block';

      scoreValue.textContent = resultData.confidenceScore + '%';
      verdictText.textContent = resultData.verdict.replace(/_/g, ' ') + ' (unverified — no evidence)';

      // Color coding
      if (resultData.verdict.includes('TRUE')) {
        verdictText.style.color = '#34d399';
      } else if (resultData.verdict.includes('FALSE')) {
        verdictText.style.color = '#f87171';
      } else {
        verdictText.style.color = '#fbbf24';
      }

      summaryText.textContent = resultData.summary;

    } catch (err) {
      loader.style.display = 'none';
      analyzeBtn.style.display = 'block';
      errorEl.style.display = 'block';
      errorEl.textContent = err.message || 'Analysis failed. Please open the dashboard for full analysis.';

      openDashboardBtn.style.display = 'block';
    }
  });
});
