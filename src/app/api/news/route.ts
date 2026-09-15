import { NextRequest, NextResponse } from "next/server";
import { guardApiRequest } from "@/lib/security/apiGuard";

export async function GET(req: NextRequest) {
  const guard = await guardApiRequest(req, {
    scope: "news:top-headlines",
    limit: 30,
    windowMs: 60_000,
  });
  if (!guard.ok) return guard.response;

  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { articles: [], error: "News service is not configured." },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(
      `https://gnews.io/api/v4/top-headlines?country=in&lang=en&max=6&apikey=${apiKey}`,
      {
        next: {
          revalidate: 300, // Refresh every 5 minutes
        },
      }
    );

    if (!response.ok) {
      console.warn(`[News] GNews API returned HTTP ${response.status}`);
      return NextResponse.json(
        { articles: [], error: "Failed to fetch top headlines." },
        { status: response.status >= 500 ? 502 : response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("[News] Error fetching top headlines:", error);

    return NextResponse.json(
      { articles: [] },
      { status: 500 }
    );
  }
}