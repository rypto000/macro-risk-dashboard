import { NextResponse } from 'next/server';
import { ismPmiHistorical } from '../../../lib/ism-pmi-data';

const FRED_API_KEY = process.env.FRED_API_KEY || '';
const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';

interface FredDataPoint {
  date: string;
  value: string;
}

interface DataPoint {
  date: string;
  value: number | null;
}

async function fetchFredData(seriesId: string) {
  const url = `${FRED_BASE_URL}?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=10000`;

  const response = await fetch(url);
  const data = await response.json();

  return data.observations?.map((obs: FredDataPoint) => ({
    date: obs.date,
    value: parseFloat(obs.value) || null
  })) || [];
}

async function fetchIsmPmiData() {
  try {
    // Use historical data
    const historicalData: DataPoint[] = ismPmiHistorical;

    // Fetch recent data from DBnomics API (2020-05 onwards)
    const apiUrl = 'https://api.db.nomics.world/v22/series/ISM/pmi?observations=1&format=json&limit=1000';
    const response = await fetch(apiUrl);
    const apiData = await response.json();

    // DBnomics returns data in series.docs[0] with period and value arrays
    const doc = apiData.series?.docs?.[0];
    const recentData: DataPoint[] = [];

    if (doc && doc.period && doc.value) {
      for (let i = 0; i < doc.period.length; i++) {
        const date = doc.period[i] + '-01'; // Convert YYYY-MM to YYYY-MM-01
        const value = parseFloat(doc.value[i]);
        // Filter out erroneous data: PMI should be between 30-100 (historically never below 30)
        if (date >= '2020-05-01' && value >= 30 && value <= 100) {
          recentData.push({
            date: date,
            value: value
          });
        }
      }
    }

    // Combine historical and recent data
    const combinedData = [...historicalData, ...recentData].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return combinedData;
  } catch (error) {
    console.error('ISM PMI Error:', error);
    return ismPmiHistorical; // Fallback to historical data only
  }
}

export async function GET() {
  try {
    if (!FRED_API_KEY) {
      return NextResponse.json(
        { error: 'FRED_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Fetch all indicators in parallel
    const [t10y2y, unrate, hyOas, ismPmi] = await Promise.all([
      fetchFredData('T10Y2Y'),    // 10Y-2Y spread
      fetchFredData('UNRATE'),    // Unemployment rate
      fetchFredData('BAMLH0A0HYM2'), // High Yield OAS
      fetchIsmPmiData()           // ISM PMI
    ]);

    return NextResponse.json({
      t10y2y: t10y2y.reverse(),
      unrate: unrate.reverse(),
      hyOas: hyOas.reverse(),
      ismPmi: ismPmi,
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
