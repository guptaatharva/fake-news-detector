# VeraCius AI

VeraCius is a next-generation, AI-powered news verification platform. It doesn't just rely on an LLM's pre-trained memory—it actively functions as an **Autonomous Fact-Checking Agent** by searching the live internet and scraping evidence in real-time to combat fake news and misinformation.

## 🚀 Key Features

* **Agentic RAG Architecture**: A sophisticated multi-stage pipeline that actively cross-references up to 5 unique claims against live internet data to prevent AI hallucinations.
* **Social Media & Web Harvesting**: Automatically queries DuckDuckGo for up to 10 independent sources per claim, explicitly hunting for evidence across general news sites and social media platforms (X/Twitter, Instagram, Threads, TikTok).
* **Deep Web Scraping**: Uses headless Chromium (Puppeteer) and Mozilla Readability to extract raw article text while bypassing ads and clutter.
* **Transparent Scoring Engine**: The AI provides a detailed `Score Breakdown` explaining exactly why it arrived at its confidence score based on the credibility and volume of the gathered evidence.
* **Live Agent Terminal UI**: Watch the AI "think". The dashboard features a real-time, hacker-style terminal that logs every step the agent takes (e.g., extracting claims, searching the web, scraping specific URLs).
* **Anti-Circular Verification**: Built-in domain filtering ensures the AI cannot use the original source article to prove the original source article is true.

## 🧠 How It Works (The 4-Stage Pipeline)

When you submit a URL or text snippet, VeriLens executes the following atomic steps:

1. **Extraction (`/api/analyze/extract`)**: The LLM reads the submitted content and extracts the top 5 distinct, verifiable factual claims.
2. **Search (`/api/analyze/search-query`)**: The backend runs parallel searches (General Web + Social Media operators) to gather up to 10 independent sources per claim.
3. **Scrape (`/api/analyze/scrape`)**: The system spins up Puppeteer to physically visit the discovered URLs and extracts the live text from those articles.
4. **Synthesis (`/api/analyze/synthesize`)**: The LLM evaluates the original claims based **strictly** on the freshly scraped evidence, assigning a final verdict, a confidence score, and a detailed score breakdown.

## 💻 Tech Stack

* **Frontend**: Next.js 15 (App Router), React, Tailwind CSS, shadcn/ui, Lucide Icons.
* **Backend**: Node.js API Routes, Vercel AI SDK (`@ai-sdk/openai-compatible`).
* **Scraping Engine**: Puppeteer, `@mozilla/readability`, Cheerio, JSDOM.
* **Database & Auth**: Prisma ORM, Supabase (PostgreSQL), NextAuth.js.

## 🛠️ Getting Started

### Prerequisites
* Node.js (v18+)
* An NVIDIA API Key (for the NIM Llama 3.1 endpoint)
* A Supabase PostgreSQL database URL

### Installation

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory and add the following:
   ```env
   DATABASE_URL="postgres://your_supabase_url_here"
   AUTH_SECRET="your_nextauth_secret"
   NVIDIA_API_KEY="your_nvidia_nim_api_key_here"
   ```

3. **Initialize the Database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser to access the dashboard.

## ⚠️ Notes on Deployment
Because this application relies on Puppeteer (headless Chromium) for deep web scraping, standard Vercel serverless deployments may exceed their size limits. If deploying to production, it is highly recommended to host the application on a Dockerized environment (like Railway, Render, or a VPS) to ensure the Puppeteer binary runs smoothly.
