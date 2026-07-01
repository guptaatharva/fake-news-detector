import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.GNEWS_API_KEY;

  try {
    const response = await fetch(
      `https://gnews.io/api/v4/top-headlines?country=in&lang=en&max=6&apikey=${apiKey}`,
      {
        next: {
          revalidate: 300, // Refresh every 5 minutes
        },
      }
    );

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { articles: [] },
      { status: 500 }
    );
  }
}