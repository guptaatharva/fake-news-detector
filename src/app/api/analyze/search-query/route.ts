import { NextRequest, NextResponse } from 'next/server';
import { SearchService } from '@/lib/services/search.service';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { claim, originalUrl } = await req.json();

    if (!claim) {
      return NextResponse.json({ error: "No claim provided for searching." }, { status: 400 });
    }

    const searchResults = await SearchService.searchWeb(claim, 4);
    
    // Filter results
    const filteredResults = [];
    for (const result of searchResults) {
      if (filteredResults.length >= 2) break; // Only need 2 independent sources
      
      // Skip the original URL to prevent circular verification
      if (originalUrl) {
        try {
          const originalHost = new URL(originalUrl).hostname.replace('www.', '');
          if (result.link.includes(originalHost) || result.link === originalUrl) {
            continue;
          }
        } catch (e) {
          if (result.link === originalUrl) continue;
        }
      }

      filteredResults.push(result);
    }

    return NextResponse.json({ results: filteredResults });
  } catch (error) {
    console.error('Error during search query:', error);
    return NextResponse.json({ error: 'An error occurred during search query.' }, { status: 500 });
  }
}
