import { NextResponse } from 'next/server';
import { ismPmiHistorical } from '@/lib/ism-pmi-data';

interface DataPoint {
  date: string;
  value: number | null;
}

export async function GET() {
  try {
    // Use imported historical data (1990-04 to 2020-04)
    const historicalData: DataPoint[] = ismPmiHistorical;

    // Fetch recent data from DBnomics API (2020-05 onwards)
    const apiUrl = 'https://api.db.nomics.world/v22/series/ISM/pmi?observations=1&format=json&limit=1000';
    const response = await fetch(apiUrl);
    const apiData = await response.json();

    const recentData: DataPoint[] = apiData.series?.observations
      ?.map((obs: any) => ({
        date: obs.period,
        value: parseFloat(obs.value) || null
      }))
      .filter((d: DataPoint) => d.date >= '2020-05-01') || [];

    // Combine historical and recent data
    const combinedData = [...historicalData, ...recentData].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return NextResponse.json({
      ismPmi: combinedData,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('ISM PMI API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ISM PMI data' },
      { status: 500 }
    );
  }
}
