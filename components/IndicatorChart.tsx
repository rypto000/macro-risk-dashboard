'use client';

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
}

export default function IndicatorChart({
  data,
  title,
  dataKey,
  referenceLine,
  referenceLabel,
  color
}: IndicatorChartProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={(date) => {
              const d = new Date(date);
              return `${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`;
            }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            labelFormatter={(date) => new Date(date).toLocaleDateString()}
            formatter={(value: number) => value.toFixed(2)}
          />
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
    </div>
  );
}
