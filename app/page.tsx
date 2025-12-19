'use client';

import { useEffect, useState } from 'react';
import IndicatorChart from '../components/IndicatorChart';
import SummaryTable from '../components/SummaryTable';

interface DataPoint {
  date: string;
  value: number | null;
}

interface FredData {
  t10y2y: DataPoint[];
  unrate: DataPoint[];
  hyOas: DataPoint[];
  lastUpdated: string;
}

export default function Page() {
  const [data, setData] = useState<FredData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ISM PMI - 수동 입력 필요 (최신값)
  const ismPmiValue = 48.20; // 2025-11

  useEffect(() => {
    fetch('/api/fred')
      .then((res) => res.json())
      .then((fetchedData) => {
        if (fetchedData.error) {
          setError(fetchedData.error);
        } else {
          setData(fetchedData);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-4xl font-bold mb-8">Macro Risk Dashboard</h1>
        <p>Loading data...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-4xl font-bold mb-8">Macro Risk Dashboard</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
          {error.includes('FRED_API_KEY') && (
            <p className="mt-2 text-sm">
              FRED API 키가 필요합니다. .env.local 파일에 FRED_API_KEY를 설정하세요.
              <br />
              API 키는 <a href="https://fred.stlouisfed.org/docs/api/api_key.html" className="underline" target="_blank">여기</a>에서 무료로 발급받을 수 있습니다.
            </p>
          )}
        </div>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  // Get latest values
  const latestT10Y2Y = data.t10y2y[data.t10y2y.length - 1]?.value;
  const latestUnrate = data.unrate[data.unrate.length - 1]?.value;
  const latestHyOas = data.hyOas[data.hyOas.length - 1]?.value;

  // Calculate overall risk level
  const warnings = [
    latestT10Y2Y !== null && latestT10Y2Y <= 0,
    latestUnrate !== null && latestUnrate >= 4.5,
    ismPmiValue < 50,
    latestHyOas !== null && latestHyOas >= 6.0
  ].filter(Boolean).length;

  const riskLevel = warnings >= 3 ? 'RED' : warnings >= 1 ? 'YELLOW' : 'GREEN';
  const riskColor = riskLevel === 'RED' ? 'bg-red-500' : riskLevel === 'YELLOW' ? 'bg-yellow-500' : 'bg-green-500';

  const indicators = [
    {
      name: 'T10Y2Y (금리차)',
      value: latestT10Y2Y,
      threshold: 0,
      status: (latestT10Y2Y !== null && latestT10Y2Y <= 0) ? 'WARN' : 'OK',
      description: '10Y-2Y 금리 스프레드'
    },
    {
      name: 'UNRATE (실업률)',
      value: latestUnrate,
      threshold: 4.5,
      status: (latestUnrate !== null && latestUnrate >= 4.5) ? 'WARN' : 'OK',
      description: '실업률'
    },
    {
      name: 'ISM PMI (제조업)',
      value: ismPmiValue,
      threshold: 50,
      status: ismPmiValue < 50 ? 'WARN' : 'OK',
      description: 'ISM 제조업 PMI'
    },
    {
      name: 'HY OAS (하이일드)',
      value: latestHyOas,
      threshold: 6.0,
      status: (latestHyOas !== null && latestHyOas >= 6.0) ? 'WARN' : 'OK',
      description: '하이일드 OAS'
    }
  ];

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-8">Macro Risk Dashboard</h1>

      {/* Risk Level Badge */}
      <div className="mb-8">
        <div className={`inline-block px-6 py-3 rounded-lg ${riskColor} text-white font-bold text-2xl`}>
          종합위험등급: {riskLevel}
        </div>
        <p className="mt-2 text-gray-600">
          마지막 업데이트: {new Date(data.lastUpdated).toLocaleString('ko-KR')}
        </p>
      </div>

      {/* Summary Table */}
      <div className="mb-8">
        <SummaryTable indicators={indicators} />
      </div>

      {/* Charts */}
      <div className="space-y-8">
        <IndicatorChart
          data={data.t10y2y}
          title="📈 10Y-2Y 금리차 (T10Y2Y)"
          dataKey="T10Y2Y"
          referenceLine={0}
          referenceLabel="기준선: 0"
          color="#8884d8"
        />

        <IndicatorChart
          data={data.unrate}
          title="📈 실업률 (UNRATE)"
          dataKey="UNRATE"
          referenceLine={4.5}
          referenceLabel="기준선: 4.5%"
          color="#82ca9d"
        />

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-bold mb-4">📈 ISM 제조업 PMI</h3>
          <p className="text-gray-600">
            현재값: <span className="font-bold text-2xl">{ismPmiValue}</span> (2025-11)
          </p>
          <p className="text-sm text-gray-500 mt-2">
            ※ ISM PMI는 수동 업데이트가 필요합니다. 최신 데이터는{' '}
            <a
              href="https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/"
              target="_blank"
              className="text-blue-500 underline"
            >
              ISM 공식 사이트
            </a>
            에서 확인하세요.
          </p>
        </div>

        <IndicatorChart
          data={data.hyOas}
          title="📈 하이일드 OAS (BAMLH0A0HYM2)"
          dataKey="HY OAS"
          referenceLine={6.0}
          referenceLabel="기준선: 6.0%"
          color="#ffc658"
        />
      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-gray-500 text-sm">
        <p>Data source: Federal Reserve Economic Data (FRED)</p>
      </div>
    </main>
  );
}
