'use client';

import { useEffect, useState } from 'react';
import IndicatorChart from '../components/IndicatorChart';
import SummaryTable from '../components/SummaryTable';
import CombinedChart from '../components/CombinedChart';
import FearGreedCards from '../components/FearGreedCards';
import UpbitVolumeChart from '../components/UpbitVolumeChart';
import MarkerManager from '../components/MarkerManager';

interface DataPoint {
  date: string;
  value: number | null;
}

interface FredData {
  t10y2y: DataPoint[];
  unrate: DataPoint[];
  hyOas: DataPoint[];
  ismPmi: DataPoint[];
  lastUpdated: string;
}

interface UpbitVolumeData {
  date: string;
  volume: number;
  volumeTrillion: number;
  ma7: number;
  ma30: number;
  ma90: number;
}

interface UpbitLatest {
  date: string;
  volumeTrillion: number;
  ma90: number;
  status: 'normal' | 'overheated' | 'cold';
}

interface ChartMarker {
  id: string;
  date: string;
  label: string;
  color: string;
  description?: string;
}

export default function Page() {
  const [data, setData] = useState<FredData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upbit volume data
  const [upbitData, setUpbitData] = useState<UpbitVolumeData[]>([]);
  const [upbitLatest, setUpbitLatest] = useState<UpbitLatest | null>(null);
  const [upbitStatistics, setUpbitStatistics] = useState<any>(null);
  const [upbitLoading, setUpbitLoading] = useState(true);

  // Chart markers
  const [markers, setMarkers] = useState<ChartMarker[]>([]);
  const [markersKey, setMarkersKey] = useState(0); // For forcing refresh

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

  // Fetch Upbit volume data
  useEffect(() => {
    fetch('/api/upbit-volume')
      .then((res) => res.json())
      .then((response) => {
        if (response.success) {
          setUpbitData(response.data || []);
          setUpbitLatest(response.latest || null);
          setUpbitStatistics(response.statistics || null);
        }
        setUpbitLoading(false);
      })
      .catch((err) => {
        console.error('업비트 데이터 로딩 실패:', err);
        setUpbitLoading(false);
      });
  }, []);

  // Fetch chart markers
  useEffect(() => {
    fetch('/api/chart-markers')
      .then((res) => res.json())
      .then((response) => {
        if (response.success) {
          setMarkers(response.markers || []);
        }
      })
      .catch((err) => {
        console.error('마커 로딩 실패:', err);
      });
  }, [markersKey]);

  // Refresh markers
  const handleMarkersChange = () => {
    setMarkersKey(prev => prev + 1);
  };

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

  // Get latest indicator values
  const latestT10Y2Y = data.t10y2y[data.t10y2y.length - 1]?.value;
  const latestUnrate = data.unrate[data.unrate.length - 1]?.value;
  const latestHyOas = data.hyOas[data.hyOas.length - 1]?.value;
  const latestIsmPmi = data.ismPmi[data.ismPmi.length - 1]?.value;

  const indicators = [
    {
      name: 'T10Y2Y (금리차)',
      value: latestT10Y2Y,
      threshold: 0,
      status: (latestT10Y2Y !== null && latestT10Y2Y <= 0) ? 'WARN' as const : 'OK' as const,
      description: '10Y-2Y 금리 스프레드'
    },
    {
      name: 'UNRATE (실업률)',
      value: latestUnrate,
      threshold: 4.5,
      status: (latestUnrate !== null && latestUnrate >= 4.5) ? 'WARN' as const : 'OK' as const,
      description: '실업률'
    },
    {
      name: 'ISM PMI (제조업)',
      value: latestIsmPmi,
      threshold: 50,
      status: (latestIsmPmi !== null && latestIsmPmi < 50) ? 'WARN' as const : 'OK' as const,
      description: 'ISM 제조업 PMI'
    },
    {
      name: 'HY OAS (하이일드)',
      value: latestHyOas,
      threshold: 6.0,
      status: (latestHyOas !== null && latestHyOas >= 6.0) ? 'WARN' as const : 'OK' as const,
      description: '하이일드 OAS'
    }
  ];

  return (
    <main className="min-h-screen p-8 bg-slate-900">
      <h1 className="text-4xl font-bold mb-8 text-white">Macro Risk Dashboard</h1>

      <p className="mb-6 text-gray-400">
        마지막 업데이트: {new Date(data.lastUpdated).toLocaleString('ko-KR')}
      </p>

      {/* Fear & Greed Indices */}
      <div className="mb-8">
        <FearGreedCards />
      </div>

      {/* Summary Table */}
      <div className="mb-8">
        <SummaryTable indicators={indicators} />
      </div>

      {/* Upbit Volume Chart (암호화폐 시장 온도) */}
      {!upbitLoading && upbitData.length > 0 && (
        <div className="mb-8">
          <UpbitVolumeChart
            data={upbitData}
            latest={upbitLatest || undefined}
            statistics={upbitStatistics || undefined}
            markers={markers}
          />
        </div>
      )}

      {/* Chart Marker Manager */}
      <div className="mb-8">
        <MarkerManager onMarkersChange={handleMarkersChange} />
      </div>

      {/* Individual Charts */}
      <div className="space-y-8 mb-8">
        <IndicatorChart
          data={data.t10y2y}
          title="📈 10Y-2Y 금리차 (T10Y2Y)"
          dataKey="T10Y2Y"
          referenceLine={0}
          referenceLabel="기준선: 0"
          color="#8884d8"
          explanation={`
            <p class="font-bold mb-2">📊 10년물-2년물 국채 금리 스프레드</p>
            <ul class="space-y-1 ml-4">
              <li><strong>양수(+):</strong> 정상적인 경제 상황. 장기 금리가 단기 금리보다 높음</li>
              <li><strong>0에 가까움:</strong> 평탄화된 수익률 곡선. 경제 불확실성 증가</li>
              <li><strong>음수(-):</strong> 역전된 수익률 곡선. <span class="text-red-600 font-bold">강력한 경기침체 신호</span></li>
              <li><strong>역사적으로:</strong> 금리 역전 후 평균 12-18개월 내 경기침체 발생</li>
            </ul>
          `}
        />

        <IndicatorChart
          data={data.unrate}
          title="📈 실업률 (UNRATE)"
          dataKey="UNRATE"
          referenceLine={4.5}
          referenceLabel="기준선: 4.5%"
          color="#82ca9d"
          explanation={`
            <p class="font-bold mb-2">📊 미국 실업률 (Unemployment Rate)</p>
            <ul class="space-y-1 ml-4">
              <li><strong>3-4%:</strong> 완전 고용 수준. 건강한 경제</li>
              <li><strong>4.5% 이상:</strong> <span class="text-yellow-600 font-bold">경제 둔화 신호</span></li>
              <li><strong>6% 이상:</strong> <span class="text-red-600 font-bold">경기침체 수준</span></li>
              <li><strong>급격한 상승:</strong> 사업 축소, 소비 감소, 경제 위축 가능성</li>
            </ul>
          `}
        />

        <IndicatorChart
          data={data.ismPmi}
          title="📈 ISM 제조업 PMI"
          dataKey="ISM PMI"
          referenceLine={50}
          referenceLabel="기준선: 50"
          color="#f59e0b"
          explanation={`
            <p class="font-bold mb-2">📊 ISM 제조업 구매관리자 지수</p>
            <ul class="space-y-1 ml-4">
              <li><strong>50 이상:</strong> 제조업 확장. 경제 성장</li>
              <li><strong>50:</strong> 중립. 변화 없음</li>
              <li><strong>50 미만:</strong> <span class="text-yellow-600 font-bold">제조업 위축. 경제 둔화 가능성</span></li>
              <li><strong>43 미만:</strong> <span class="text-red-600 font-bold">전체 경제 침체 신호</span></li>
              <li><strong>역사적으로:</strong> 3개월 연속 50 미만일 때 경기침체 가능성 높음</li>
            </ul>
          `}
        />

        <IndicatorChart
          data={data.hyOas}
          title="📈 하이일드 OAS (BAMLH0A0HYM2)"
          dataKey="HY OAS"
          referenceLine={6.0}
          referenceLabel="기준선: 6.0%"
          color="#ffc658"
          explanation={`
            <p class="font-bold mb-2">📊 하이일드 채권 옵션조정 스프레드</p>
            <ul class="space-y-1 ml-4">
              <li><strong>3-5%:</strong> 낮은 신용 위험. 시장 안정</li>
              <li><strong>6% 이상:</strong> <span class="text-yellow-600 font-bold">신용 위험 증가</span></li>
              <li><strong>8-10% 이상:</strong> <span class="text-red-600 font-bold">심각한 신용 경색. 금융 위기 가능성</span></li>
              <li><strong>급격한 상승:</strong> 투자자들이 안전자산으로 도피. 기업 부도 위험 증가</li>
            </ul>
          `}
        />
      </div>

      {/* Combined Chart */}
      <div className="mb-8">
        <CombinedChart
          t10y2y={data.t10y2y}
          unrate={data.unrate}
          ismPmi={data.ismPmi}
          hyOas={data.hyOas}
        />
      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-gray-400 text-sm">
        <p>Data source: Federal Reserve Economic Data (FRED)</p>
        <p className="mt-1">Last deployed: {new Date().toLocaleString('ko-KR')}</p>
      </div>
    </main>
  );
}
