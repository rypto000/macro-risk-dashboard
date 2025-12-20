import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface FearGreedData {
  crypto: {
    value: number;
    label: string;
    lastUpdated: string;
  } | null;
  stock: {
    value: number;
    label: string;
    lastUpdated: string;
  } | null;
}

// Fetch Crypto Fear & Greed from Alternative.me
async function fetchCryptoFearGreed() {
  try {
    const response = await fetch('https://api.alternative.me/fng/?limit=1', {
      next: { revalidate: 86400 } // Cache for 24 hours
    });

    if (!response.ok) {
      throw new Error('Failed to fetch crypto fear & greed');
    }

    const data = await response.json();
    const latest = data.data[0];

    return {
      value: parseInt(latest.value),
      label: latest.value_classification,
      lastUpdated: new Date(parseInt(latest.timestamp) * 1000).toISOString()
    };
  } catch (error) {
    console.error('Error fetching crypto fear & greed:', error);
    return null;
  }
}

// Scrape Stock Fear & Greed from CNN
async function fetchStockFearGreed() {
  try {
    const response = await fetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata', {
      next: { revalidate: 86400 } // Cache for 24 hours
    });

    if (!response.ok) {
      throw new Error('Failed to fetch stock fear & greed');
    }

    const data = await response.json();
    const currentScore = data.fear_and_greed.score;
    const rating = data.fear_and_greed.rating;

    return {
      value: Math.round(currentScore),
      label: rating,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching stock fear & greed:', error);
    return null;
  }
}

export async function GET() {
  try {
    const [crypto, stock] = await Promise.all([
      fetchCryptoFearGreed(),
      fetchStockFearGreed()
    ]);

    const data: FearGreedData = {
      crypto,
      stock
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in fear-greed API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fear & greed data' },
      { status: 500 }
    );
  }
}
