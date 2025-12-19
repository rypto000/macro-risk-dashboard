import { NextResponse } from 'next/server';
import { ismPmiHistorical } from '../../../lib/ism-pmi-data';

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
