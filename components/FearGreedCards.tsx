'use client';

import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';

interface FearGreedIndex {
  value: number;
  label: string;
  lastUpdated: string;
}

interface FearGreedData {
  crypto: FearGreedIndex | null;
  stock: FearGreedIndex | null;
}

function getColorByValue(value: number): string {
  if (value <= 25) return '#ef4444'; // Extreme Fear - Red
  if (value <= 45) return '#f97316'; // Fear - Orange
  if (value <= 55) return '#f59e0b'; // Neutral - Yellow
  if (value <= 75) return '#84cc16'; // Greed - Lime
  return '#10b981'; // Extreme Greed - Green
}

function FearGreedGauge({ title, data, icon }: { title: string; data: FearGreedIndex | null; icon: string }) {
  if (!data) {
    return (
      <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
        <h3 className="text-lg font-bold mb-4 text-white">
          {icon} {title}
        </h3>
        <div className="text-center text-gray-400 py-8">
          데이터를 불러올 수 없습니다
        </div>
      </div>
    );
  }

  const gaugeOption = {
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,
        splitNumber: 4,
        axisLine: {
          lineStyle: {
            width: 20,
            color: [
              [0.25, '#ef4444'],   // Extreme Fear
              [0.45, '#f97316'],   // Fear
              [0.55, '#f59e0b'],   // Neutral
              [0.75, '#84cc16'],   // Greed
              [1.0, '#10b981']     // Extreme Greed
            ]
          }
        },
        pointer: {
          itemStyle: {
            color: '#ffffff'
          },
          width: 5
        },
        axisTick: {
          show: false
        },
        splitLine: {
          length: 15,
          lineStyle: {
            color: '#ffffff',
            width: 2
          }
        },
        axisLabel: {
          distance: 25,
          color: '#94a3b8',
          fontSize: 11,
          formatter: function(value: number) {
            return value.toFixed(0);
          }
        },
        detail: {
          valueAnimation: true,
          formatter: function(value: number) {
            return value.toFixed(0);
          },
          color: '#ffffff',
          fontSize: 32,
          fontWeight: 'bold',
          offsetCenter: [0, '70%']
        },
        data: [
          {
            value: data.value,
            name: data.label,
            title: {
              offsetCenter: [0, '90%'],
              fontSize: 16,
              color: getColorByValue(data.value)
            }
          }
        ]
      }
    ]
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
      <h3 className="text-lg font-bold mb-2 text-white">
        {icon} {title}
      </h3>

      <ReactECharts
        option={gaugeOption}
        style={{ height: '220px' }}
        opts={{ renderer: 'canvas' }}
      />

      <div className="mt-2 text-center">
        <p className="text-xs text-gray-400">
          마지막 업데이트: {new Date(data.lastUpdated).toLocaleDateString('ko-KR')}
        </p>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-400">Extreme Fear (0-25)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-gray-400">Fear (25-45)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-gray-400">Neutral (45-55)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-lime-500"></div>
            <span className="text-gray-400">Greed (55-75)</span>
          </div>
          <div className="flex items-center space-x-2 col-span-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-400">Extreme Greed (75-100)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FearGreedCards() {
  const [data, setData] = useState<FearGreedData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/fear-greed')
      .then((res) => res.json())
      .then((fetchedData) => {
        setData(fetchedData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch fear & greed data:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
          <p className="text-gray-400">Loading...</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-white">
        💹 Market Sentiment (Fear & Greed Index)
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FearGreedGauge
          title="Crypto Fear & Greed"
          data={data?.crypto || null}
          icon="🪙"
        />
        <FearGreedGauge
          title="Stock Fear & Greed"
          data={data?.stock || null}
          icon="📈"
        />
      </div>

      <p className="mt-4 text-xs text-gray-500">
        * Fear & Greed Index는 시장 심리 지표입니다. Extreme Fear = 매수 기회, Extreme Greed = 과열 경고
      </p>
    </div>
  );
}
