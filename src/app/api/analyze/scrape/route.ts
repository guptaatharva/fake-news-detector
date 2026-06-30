import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromUrl } from '@/lib/extractor';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "No URL provided for scraping." }, { status: 400 });
    }

    const text = await extractTextFromUrl(url);

    return NextResponse.json({ text });
  } catch (error) {
    console.error('Error during scraping:', error);
    return NextResponse.json({ error: 'An error occurred during scraping.' }, { status: 500 });
  }
}
