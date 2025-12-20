'use client';

import { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

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

  const toggleIndicator = (key: keyof typeof visible) => {
    setVisible(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Prepare data for ECharts
  const chartOption = useMemo(() => {
    // Calculate min/max for normalization
    const t10y2yMinMax = getMinMax(t10y2y);
    const unrateMinMax = getMinMax(unrate);
    const ismPmiMinMax = getMinMax(ismPmi);
    const hyOasMinMax = getMinMax(hyOas);

    // Combine all dates
    const dateMap = new Map<string, any>();

    t10y2y.forEach(d => {
      if (!dateMap.has(d.date)) dateMap.set(d.date, { date: d.date });
      dateMap.get(d.date)!.t10y2y = normalize(d.value, t10y2yMinMax.min, t10y2yMinMax.max, true);
    });

    unrate.forEach(d => {
      if (!dateMap.has(d.date)) dateMap.set(d.date, { date: d.date });
      dateMap.get(d.date)!.unrate = normalize(d.value, unrateMinMax.min, unrateMinMax.max, false);
    });

    ismPmi.forEach(d => {
      if (!dateMap.has(d.date)) dateMap.set(d.date, { date: d.date });
      dateMap.get(d.date)!.ismPmi = normalize(d.value, ismPmiMinMax.min, ismPmiMinMax.max, true);
    });

    hyOas.forEach(d => {
      if (!dateMap.has(d.date)) dateMap.set(d.date, { date: d.date });
      dateMap.get(d.date)!.hyOas = normalize(d.value, hyOasMinMax.min, hyOasMinMax.max, false);
    });

    const combinedData = Array.from(dateMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    const dates = combinedData.map(d => d.date);
    const t10y2yData = combinedData.map(d => d.t10y2y ?? null);
    const unrateData = combinedData.map(d => d.unrate ?? null);
    const ismPmiData = combinedData.map(d => d.ismPmi ?? null);
    const hyOasData = combinedData.map(d => d.hyOas ?? null);

    const series = [];

    if (visible.t10y2y) {
      series.push({
        name: 'T10Y2Y',
        type: 'line',
        data: t10y2yData,
        smooth: false,
        symbol: 'none',
        lineStyle: {
          color: '#8884d8',
          width: 2
        }
      });
    }

    if (visible.unrate) {
      series.push({
        name: 'UNRATE',
        type: 'line',
        data: unrateData,
        smooth: false,
        symbol: 'none',
        lineStyle: {
          color: '#82ca9d',
          width: 2
        }
      });
    }

    if (visible.ismPmi) {
      series.push({
        name: 'ISM PMI',
        type: 'line',
        data: ismPmiData,
        smooth: false,
        symbol: 'none',
        lineStyle: {
          color: '#f59e0b',
          width: 2
        }
      });
    }

    if (visible.hyOas) {
      series.push({
        name: 'HY OAS',
        type: 'line',
        data: hyOasData,
        smooth: false,
        symbol: 'none',
        lineStyle: {
          color: '#ffc658',
          width: 2
        }
      });
    }

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(51, 65, 85, 0.95)',
        borderColor: '#475569',
        textStyle: {
          color: '#e5e7eb'
        },
        formatter: function(params: any) {
          const date = new Date(params[0].axisValue);
          const dateStr = date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long'
          });
          let result = `${dateStr}<br/>`;
          params.forEach((param: any) => {
            const value = param.value !== null && param.value !== undefined
              ? param.value.toFixed(1)
              : 'N/A';
            result += `<span style="color:${param.color}">● ${param.seriesName}: ${value}</span><br/>`;
          });
          return result;
        }
      },
      legend: {
        data: ['T10Y2Y', 'UNRATE', 'ISM PMI', 'HY OAS'],
        textStyle: {
          color: '#94a3b8'
        },
        top: 10
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: false
        }
      ],
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          rotate: 45,
          color: '#94a3b8',
          fontSize: 11,
          formatter: function(value: string) {
            const d = new Date(value);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          }
        },
        axisLine: {
          lineStyle: {
            color: '#475569'
          }
        }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: {
          color: '#94a3b8',
          fontSize: 12
        },
        axisLine: {
          lineStyle: {
            color: '#475569'
          }
        },
        splitLine: {
          lineStyle: {
            color: '#334155',
            type: 'dashed'
          }
        },
        name: '위험도 (0=안전, 100=위험)',
        nameTextStyle: {
          color: '#94a3b8',
          fontSize: 12
        }
      },
      series: series
    };
  }, [t10y2y, unrate, ismPmi, hyOas, visible]);

  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
      <h2 className="text-2xl font-bold mb-4 text-white">📊 종합 지표 차트 (위험도 0-100)</h2>
      <p className="text-sm text-gray-400 mb-4">
        💡 마우스 스크롤: 확대/축소 | 클릭 드래그: 좌우 이동
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

      <ReactECharts
        option={chartOption}
        style={{ height: '500px' }}
        opts={{ renderer: 'canvas' }}
      />

      <p className="mt-4 text-xs text-gray-400">
        * 모든 지표를 0-100 위험도 스케일로 정규화 (100 = 최고 위험, 0 = 안전)
        <br />
        * 차트 위에서 마우스 스크롤로 확대/축소, 클릭 드래그로 좌우 이동 가능
      </p>
    </div>
  );
}
