'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
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
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const [isDataOpen, setIsDataOpen] = useState(false);
  const [zoomRange, setZoomRange] = useState<{ start: number; end: number }>({ start: 0, end: 1 });
  const chartRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; rangeStart: number; rangeEnd: number } | null>(null);

  // Mouse wheel zoom and pan handler with throttle
  useEffect(() => {
    let lastUpdate = 0;
    const throttleMs = 50;

    const handleWheel = (e: WheelEvent) => {
      if (chartRef.current && chartRef.current.contains(e.target as Node)) {
        e.preventDefault();

        const now = Date.now();
        if (now - lastUpdate < throttleMs) {
          return;
        }
        lastUpdate = now;

        if (e.shiftKey) {
          // Shift + Scroll: Pan left/right
          const panSpeed = 0.05;
          const delta = e.deltaY > 0 ? panSpeed : -panSpeed;

          setZoomRange(prev => {
            const currentRange = prev.end - prev.start;
            let newStart = prev.start + delta;
            let newEnd = prev.end + delta;

            if (newStart < 0) {
              newStart = 0;
              newEnd = currentRange;
            } else if (newEnd > 1) {
              newEnd = 1;
              newStart = 1 - currentRange;
            }

            return { start: newStart, end: newEnd };
          });
        } else {
          // Normal Scroll: Zoom in/out
          const zoomSpeed = 0.1;
          const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;

          setZoomRange(prev => {
            const currentRange = prev.end - prev.start;
            const newRange = Math.max(0.1, Math.min(1, currentRange - delta));

            const center = (prev.start + prev.end) / 2;
            let newStart = center - newRange / 2;
            let newEnd = center + newRange / 2;

            if (newStart < 0) {
              newStart = 0;
              newEnd = newRange;
            } else if (newEnd > 1) {
              newEnd = 1;
              newStart = 1 - newRange;
            }

            return { start: newStart, end: newEnd };
          });
        }
      }
    };

    const chartElement = chartRef.current;
    if (chartElement) {
      chartElement.addEventListener('wheel', handleWheel, { passive: false });
      return () => chartElement.removeEventListener('wheel', handleWheel);
    }
  }, []);

  // Mouse drag handler for panning
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (chartRef.current && chartRef.current.contains(e.target as Node)) {
        setIsDragging(true);
        setDragStart({
          x: e.clientX,
          rangeStart: zoomRange.start,
          rangeEnd: zoomRange.end
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && dragStart && chartRef.current) {
        const deltaX = e.clientX - dragStart.x;
        const chartWidth = chartRef.current.offsetWidth;
        const currentRange = dragStart.rangeEnd - dragStart.rangeStart;

        const rangeDelta = -(deltaX / chartWidth) * currentRange;

        let newStart = dragStart.rangeStart + rangeDelta;
        let newEnd = dragStart.rangeEnd + rangeDelta;

        if (newStart < 0) {
          newStart = 0;
          newEnd = currentRange;
        } else if (newEnd > 1) {
          newEnd = 1;
          newStart = 1 - currentRange;
        }

        setZoomRange({ start: newStart, end: newEnd });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragStart(null);
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, zoomRange]);

  // Apply zoom to data with downsampling for performance
  const visibleData = useMemo(() => {
    const startIdx = Math.floor(zoomRange.start * data.length);
    const endIdx = Math.ceil(zoomRange.end * data.length);
    const slicedData = data.slice(startIdx, endIdx);

    // Downsample if too many points (keep max 1000 points)
    const maxPoints = 1000;
    if (slicedData.length > maxPoints) {
      const step = slicedData.length / maxPoints;
      const downsampled = [];
      for (let i = 0; i < maxPoints; i++) {
        const idx = Math.floor(i * step);
        downsampled.push(slicedData[idx]);
      }
      return downsampled;
    }

    return slicedData;
  }, [data, zoomRange]);

  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
      <h3 className="text-xl font-bold mb-4 text-white">{title}</h3>
      <p className="text-sm text-gray-400 mb-4">
        💡 마우스 스크롤: 확대/축소 | Shift + 스크롤: 좌우 이동 | 클릭 드래그: 좌우 이동
      </p>

      <div ref={chartRef} className={isDragging ? 'cursor-grabbing' : 'cursor-grab'}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={visibleData}>
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
      </div>

      <p className="mt-2 text-xs text-gray-400">
        * 차트 위에서 마우스 스크롤로 확대/축소, Shift+스크롤 또는 클릭 드래그로 좌우 이동 가능
      </p>

      {explanation && (
        <div className="mt-4 border-t border-slate-700 pt-4">
          <button
            onClick={() => setIsExplanationOpen(!isExplanationOpen)}
            className="flex items-center text-sm text-gray-400 hover:text-gray-200 font-medium"
          >
            <span className="mr-2">{isExplanationOpen ? '▼' : '▶'}</span>
            지표 설명 보기
          </button>
          {isExplanationOpen && (
            <div className="mt-3 text-sm text-gray-300 bg-slate-900 p-4 rounded border border-slate-700">
              <div dangerouslySetInnerHTML={{ __html: explanation }} />
            </div>
          )}
        </div>
      )}

      {/* Data Table */}
      <div className="mt-4 border-t border-slate-700 pt-4">
        <button
          onClick={() => setIsDataOpen(!isDataOpen)}
          className="flex items-center text-sm text-gray-400 hover:text-gray-200 font-medium"
        >
          <span className="mr-2">{isDataOpen ? '▼' : '▶'}</span>
          데이터 보기 ({data.length}개)
        </button>
        {isDataOpen && (
          <div className="mt-3 bg-slate-900 rounded border border-slate-700 overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-800 text-gray-300">
                  <tr>
                    <th className="px-4 py-2 text-left">날짜</th>
                    <th className="px-4 py-2 text-right">값</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  {data
                    .slice()
                    .reverse()
                    .map((item, index) => (
                      <tr
                        key={item.date}
                        className={`border-t border-slate-700 ${
                          index % 2 === 0 ? 'bg-slate-900' : 'bg-slate-850'
                        } hover:bg-slate-700`}
                      >
                        <td className="px-4 py-2">
                          {new Date(item.date).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {item.value !== null ? item.value.toFixed(2) : '-'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
