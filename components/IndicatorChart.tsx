'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface DataPoint {
  date: string;
  value: number | null;
}

interface IndicatorChartProps {
  data: DataPoint[];
  title: string;
  dataKey: string;
  referenceLine: number;
  referenceLabel: string;
  color: string;
  explanation?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-700 p-3 border border-slate-600 rounded shadow-lg">
        <p className="text-sm font-semibold text-gray-200">
          {new Date(label).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
        <p className="text-lg font-bold" style={{ color: payload[0].color }}>
          {payload[0].name}: {payload[0].value !== null ? payload[0].value.toFixed(2) : 'N/A'}
        </p>
      </div>
    );
  }
  return null;
};

export default function IndicatorChart({
  data,
  title,
  dataKey,
  referenceLine,
  referenceLabel,
  color,
  explanation
}: IndicatorChartProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
      <h3 className="text-xl font-bold mb-4 text-white">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
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
          <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} stroke="#475569" />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <ReferenceLine
            y={referenceLine}
            stroke="red"
            strokeDasharray="3 3"
            label={referenceLabel}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            name={dataKey}
          />
        </LineChart>
      </ResponsiveContainer>

      {explanation && (
        <div className="mt-4 border-t border-slate-700 pt-4">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center text-sm text-gray-400 hover:text-gray-200 font-medium"
          >
            <span className="mr-2">{isOpen ? '▼' : '▶'}</span>
            지표 설명 보기
          </button>
          {isOpen && (
            <div className="mt-3 text-sm text-gray-300 bg-slate-900 p-4 rounded border border-slate-700">
              <div dangerouslySetInnerHTML={{ __html: explanation }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
