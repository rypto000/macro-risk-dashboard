'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

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
            <strong>{entry.name}:</strong> {entry.value !== null ? entry.value.toFixed(2) : 'N/A'}
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

  // Combine all data by date
  const dateMap = new Map<string, any>();

  t10y2y.forEach(d => {
    if (!dateMap.has(d.date)) dateMap.set(d.date, { date: d.date });
    dateMap.get(d.date)!.t10y2y = d.value;
  });

  unrate.forEach(d => {
    if (!dateMap.has(d.date)) dateMap.set(d.date, { date: d.date });
    dateMap.get(d.date)!.unrate = d.value;
  });

  ismPmi.forEach(d => {
    if (!dateMap.has(d.date)) dateMap.set(d.date, { date: d.date });
    dateMap.get(d.date)!.ismPmi = d.value;
  });

  hyOas.forEach(d => {
    if (!dateMap.has(d.date)) dateMap.set(d.date, { date: d.date });
    dateMap.get(d.date)!.hyOas = d.value;
  });

  const combinedData = Array.from(dateMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const toggleIndicator = (key: keyof typeof visible) => {
    setVisible(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
      <h2 className="text-2xl font-bold mb-4 text-white">📊 종합 지표 차트</h2>

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

      <ResponsiveContainer width="100%" height={400}>
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
            yAxisId="left"
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            stroke="#475569"
            label={{ value: 'T10Y2Y / UNRATE / HY OAS', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 12 } }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            stroke="#475569"
            label={{ value: 'ISM PMI', angle: 90, position: 'insideRight', style: { fill: '#94a3b8', fontSize: 12 } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          {visible.t10y2y && (
            <>
              <ReferenceLine yAxisId="left" y={0} stroke="#8884d8" strokeDasharray="3 3" />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="t10y2y"
                stroke="#8884d8"
                strokeWidth={2}
                dot={false}
                name="T10Y2Y"
              />
            </>
          )}

          {visible.unrate && (
            <>
              <ReferenceLine yAxisId="left" y={4.5} stroke="#82ca9d" strokeDasharray="3 3" />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="unrate"
                stroke="#82ca9d"
                strokeWidth={2}
                dot={false}
                name="UNRATE"
              />
            </>
          )}

          {visible.ismPmi && (
            <>
              <ReferenceLine yAxisId="right" y={50} stroke="#f59e0b" strokeDasharray="3 3" />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="ismPmi"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                name="ISM PMI"
              />
            </>
          )}

          {visible.hyOas && (
            <>
              <ReferenceLine yAxisId="left" y={6.0} stroke="#ffc658" strokeDasharray="3 3" />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="hyOas"
                stroke="#ffc658"
                strokeWidth={2}
                dot={false}
                name="HY OAS"
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>

      <p className="mt-4 text-xs text-gray-400">
        * T10Y2Y, UNRATE, HY OAS는 왼쪽 Y축 기준 / ISM PMI는 오른쪽 Y축 기준
      </p>
    </div>
  );
}
