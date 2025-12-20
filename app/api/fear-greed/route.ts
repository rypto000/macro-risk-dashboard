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

// Fetch Stock Fear & Greed from CNN
async function fetchStockFearGreed() {
  try {
    // Try primary endpoint
    let response = await fetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      next: { revalidate: 86400 }
    });

    if (!response.ok) {
      // Fallback: try alternative endpoint
      response = await fetch('https://money.cnn.com/data/fear-and-greed/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        next: { revalidate: 86400 }
      });

      if (!response.ok) {
        throw new Error('Both CNN endpoints failed');
      }

      // Parse HTML for the value (simplified - in production would use proper HTML parsing)
      const html = await response.text();
      const scoreMatch = html.match(/<div[^>]*id="needleChart"[^>]*data-score="(\d+)"/);
      const ratingMatch = html.match(/<p[^>]*class="[^"]*market-fng-gauge__dial-number-label[^"]*">([^<]+)<\/p>/);

      if (scoreMatch && ratingMatch) {
        return {
          value: parseInt(scoreMatch[1]),
          label: ratingMatch[1].trim(),
          lastUpdated: new Date().toISOString()
        };
      }

      throw new Error('Could not parse CNN page');
    }

    // Primary endpoint succeeded
    const data = await response.json();
    const currentScore = data.fear_and_greed?.score || data.score;
    const rating = data.fear_and_greed?.rating || data.rating;

    if (currentScore === undefined || !rating) {
      throw new Error('Invalid response structure');
    }

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
