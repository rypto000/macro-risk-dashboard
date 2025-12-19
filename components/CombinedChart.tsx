'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

  const [zoomRange, setZoomRange] = useState<{ start: number; end: number }>({ start: 0, end: 1 });
  const chartRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; rangeStart: number; rangeEnd: number } | null>(null);

  // Memoize min/max calculation
  const t10y2yMinMax = useMemo(() => getMinMax(t10y2y), [t10y2y]);
  const unrateMinMax = useMemo(() => getMinMax(unrate), [unrate]);
  const ismPmiMinMax = useMemo(() => getMinMax(ismPmi), [ismPmi]);
  const hyOasMinMax = useMemo(() => getMinMax(hyOas), [hyOas]);

  // Memoize combined data
  const combinedData = useMemo(() => {
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

    return Array.from(dateMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [t10y2y, unrate, ismPmi, hyOas, t10y2yMinMax, unrateMinMax, ismPmiMinMax, hyOasMinMax]);

  const toggleIndicator = (key: keyof typeof visible) => {
    setVisible(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Mouse wheel zoom and pan handler with throttle
  useEffect(() => {
    let lastUpdate = 0;
    const throttleMs = 50; // Update max once per 50ms for smoother performance

    const handleWheel = (e: WheelEvent) => {
      if (chartRef.current && chartRef.current.contains(e.target as Node)) {
        e.preventDefault();

        const now = Date.now();
        if (now - lastUpdate < throttleMs) {
          return; // Skip this event if too soon after last update
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

            // Clamp to valid range
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
          const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed; // Scroll down = zoom out, scroll up = zoom in

          setZoomRange(prev => {
            const currentRange = prev.end - prev.start;
            const newRange = Math.max(0.1, Math.min(1, currentRange - delta));

            // Calculate center point to zoom around
            const center = (prev.start + prev.end) / 2;
            let newStart = center - newRange / 2;
            let newEnd = center + newRange / 2;

            // Clamp to valid range
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

        // Convert pixel movement to range delta
        const rangeDelta = -(deltaX / chartWidth) * currentRange;

        let newStart = dragStart.rangeStart + rangeDelta;
        let newEnd = dragStart.rangeEnd + rangeDelta;

        // Clamp to valid range
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

  // Apply zoom to data with better downsampling for performance
  const visibleData = useMemo(() => {
    const startIdx = Math.floor(zoomRange.start * combinedData.length);
    const endIdx = Math.ceil(zoomRange.end * combinedData.length);
    const slicedData = combinedData.slice(startIdx, endIdx);

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
  }, [combinedData, zoomRange]);

  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
      <h2 className="text-2xl font-bold mb-4 text-white">📊 종합 지표 차트 (위험도 0-100)</h2>
      <p className="text-sm text-gray-400 mb-4">
        💡 마우스 스크롤: 확대/축소 | Shift + 스크롤: 좌우 이동 | 클릭 드래그: 좌우 이동
      </p>

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

      <div ref={chartRef} className={isDragging ? 'cursor-grabbing' : 'cursor-grab'}>
        <ResponsiveContainer width="100%" height={500}>
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
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            stroke="#475569"
            label={{ value: '위험도 (0=안전, 100=위험)', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 12 } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

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
      </div>

      <p className="mt-4 text-xs text-gray-400">
        * 모든 지표를 0-100 위험도 스케일로 정규화 (100 = 최고 위험, 0 = 안전)
        <br />
        * 차트 위에서 마우스 스크롤로 확대/축소, Shift+스크롤 또는 클릭 드래그로 좌우 이동 가능
      </p>
    </div>
  );
}
