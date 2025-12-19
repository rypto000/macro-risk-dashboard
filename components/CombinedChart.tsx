'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';

interface DataPoint {
  date: string;
  value: number | null;
}

interface CombinedChartProps {
  t10y2y: DataPoint[];
  unrate: DataPoint[];
  ismPmi: DataPoint[];
  hyOas: DataPoint[];
}

// Helper to get min/max from data
const getMinMax = (data: DataPoint[]) => {
  const values = data.map(d => d.value).filter(v => v !== null) as number[];
  return { min: Math.min(...values), max: Math.max(...values) };
};

// Dynamic normalize function
const normalize = (value: number | null, min: number, max: number, invert: boolean = false): number | null => {
  if (value === null) return null;
  const normalized = ((value - min) / (max - min)) * 100;
  return invert ? 100 - normalized : normalized;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-700 p-3 border border-slate-600 rounded shadow-lg">
        <p className="text-sm font-semibold text-gray-200 mb-2">
          {new Date(label).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
          })}
        </p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            <strong>{entry.name}:</strong> {entry.value !== null ? entry.value.toFixed(1) : 'N/A'}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function CombinedChart({
  t10y2y,
  unrate,
  ismPmi,
  hyOas
}: CombinedChartProps) {
  const [visible, setVisible] = useState({
    t10y2y: true,
    unrate: true,
    ismPmi: true,
    hyOas: true
  });

  // Calculate min/max for each dataset
  const t10y2yMinMax = getMinMax(t10y2y);
  const unrateMinMax = getMinMax(unrate);
  const ismPmiMinMax = getMinMax(ismPmi);
  const hyOasMinMax = getMinMax(hyOas);

  // Combine all data by date and normalize to 0-100 risk scale
  const dateMap = new Map<string, any>();

  t10y2y.forEach(d => {
    if (!dateMap.has(d.date)) dateMap.set(d.date, { date: d.date });
    // T10Y2Y: invert=true (negative/lower values = higher risk)
    dateMap.get(d.date)!.t10y2y = normalize(d.value, t10y2yMinMax.min, t10y2yMinMax.max, true);
  });

  unrate.forEach(d => {
    if (!dateMap.has(d.date)) dateMap.set(d.date, { date: d.date });
    // UNRATE: invert=false (higher unemployment = higher risk)
    dateMap.get(d.date)!.unrate = normalize(d.value, unrateMinMax.min, unrateMinMax.max, false);
  });

  ismPmi.forEach(d => {
    if (!dateMap.has(d.date)) dateMap.set(d.date, { date: d.date });
    // ISM PMI: invert=true (lower PMI = higher risk)
    dateMap.get(d.date)!.ismPmi = normalize(d.value, ismPmiMinMax.min, ismPmiMinMax.max, true);
  });

  hyOas.forEach(d => {
    if (!dateMap.has(d.date)) dateMap.set(d.date, { date: d.date });
    // HY OAS: invert=false (higher spread = higher risk)
    dateMap.get(d.date)!.hyOas = normalize(d.value, hyOasMinMax.min, hyOasMinMax.max, false);
  });

  const combinedData = Array.from(dateMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const toggleIndicator = (key: keyof typeof visible) => {
    setVisible(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
      <h2 className="text-2xl font-bold mb-4 text-white">📊 종합 지표 차트 (위험도 0-100)</h2>

      {/* Toggle Checkboxes */}
      <div className="flex flex-wrap gap-4 mb-4">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={visible.t10y2y}
            onChange={() => toggleIndicator('t10y2y')}
            className="w-4 h-4"
          />
          <span className="text-sm text-gray-300">
            <span style={{ color: '#8884d8' }}>■</span> T10Y2Y (금리차)
          </span>
        </label>

        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={visible.unrate}
            onChange={() => toggleIndicator('unrate')}
            className="w-4 h-4"
          />
          <span className="text-sm text-gray-300">
            <span style={{ color: '#82ca9d' }}>■</span> UNRATE (실업률)
          </span>
        </label>

        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={visible.ismPmi}
            onChange={() => toggleIndicator('ismPmi')}
            className="w-4 h-4"
          />
          <span className="text-sm text-gray-300">
            <span style={{ color: '#f59e0b' }}>■</span> ISM PMI (제조업)
          </span>
        </label>

        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={visible.hyOas}
            onChange={() => toggleIndicator('hyOas')}
            className="w-4 h-4"
          />
          <span className="text-sm text-gray-300">
            <span style={{ color: '#ffc658' }}>■</span> HY OAS (하이일드)
          </span>
        </label>
      </div>

      <ResponsiveContainer width="100%" height={500}>
        <LineChart data={combinedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            angle={-45}
            textAnchor="end"
            height={80}
            tickFormatter={(date) => {
              const d = new Date(date);
              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            }}
            stroke="#475569"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            stroke="#475569"
            label={{ value: '위험도 (0=안전, 100=위험)', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 12 } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Brush
            dataKey="date"
            height={30}
            stroke="#475569"
            fill="#1e293b"
            tickFormatter={(date) => {
              const d = new Date(date);
              return `${d.getFullYear()}`;
            }}
          />

          {visible.t10y2y && (
            <Line
              type="monotone"
              dataKey="t10y2y"
              stroke="#8884d8"
              strokeWidth={2}
              dot={false}
              name="T10Y2Y"
            />
          )}

          {visible.unrate && (
            <Line
              type="monotone"
              dataKey="unrate"
              stroke="#82ca9d"
              strokeWidth={2}
              dot={false}
              name="UNRATE"
            />
          )}

          {visible.ismPmi && (
            <Line
              type="monotone"
              dataKey="ismPmi"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              name="ISM PMI"
            />
          )}

          {visible.hyOas && (
            <Line
              type="monotone"
              dataKey="hyOas"
              stroke="#ffc658"
              strokeWidth={2}
              dot={false}
              name="HY OAS"
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      <p className="mt-4 text-xs text-gray-400">
        * 모든 지표를 0-100 위험도 스케일로 정규화 (100 = 최고 위험, 0 = 안전)
        <br />
        * 차트 하단 슬라이더를 드래그하거나 클릭해서 특정 기간 확대 가능
      </p>
    </div>
  );
}
