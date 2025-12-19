import { NextResponse } from 'next/server';

const FRED_API_KEY = process.env.FRED_API_KEY || '';
const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';

interface FredDataPoint {
  date: string;
  value: string;
}

async function fetchFredData(seriesId: string) {
  const url = `${FRED_BASE_URL}?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=500`;

  const response = await fetch(url);
  const data = await response.json();

  return data.observations?.map((obs: FredDataPoint) => ({
    date: obs.date,
    value: parseFloat(obs.value) || null
  })) || [];
}

export async function GET() {
  try {
    if (!FRED_API_KEY) {
      return NextResponse.json(
        { error: 'FRED_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Fetch all 4 indicators
    const [t10y2y, unrate, hyOas] = await Promise.all([
      fetchFredData('T10Y2Y'),    // 10Y-2Y spread
      fetchFredData('UNRATE'),    // Unemployment rate
      fetchFredData('BAMLH0A0HYM2') // High Yield OAS
    ]);

    return NextResponse.json({
      t10y2y: t10y2y.reverse(),
      unrate: unrate.reverse(),
      hyOas: hyOas.reverse(),
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('FRED API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
