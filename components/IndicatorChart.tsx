'use client';

import { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

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

  // Prepare data for ECharts
  const chartOption = useMemo(() => {
    const dates = data.map(d => d.date);
    const values = data.map(d => d.value);

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(51, 65, 85, 0.95)',
        borderColor: '#475569',
        textStyle: {
          color: '#e5e7eb'
        },
        formatter: function(params: any) {
          const param = params[0];
          const date = new Date(param.axisValue);
          const dateStr = date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          const value = param.value !== null && param.value !== undefined
            ? param.value.toFixed(2)
            : 'N/A';
          return `${dateStr}<br/><strong>${dataKey}: ${value}</strong>`;
        }
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
        top: '10%',
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
        }
      },
      series: [
        {
          name: dataKey,
          type: 'line',
          data: values,
          smooth: false,
          symbol: 'none',
          lineStyle: {
            color: color,
            width: 2
          },
          markLine: {
            silent: true,
            symbol: 'none',
            label: {
              show: true,
              position: 'end',
              formatter: referenceLabel,
              color: '#ef4444'
            },
            lineStyle: {
              color: '#ef4444',
              type: 'dashed',
              width: 2
            },
            data: [
              {
                yAxis: referenceLine
              }
            ]
          }
        }
      ]
    };
  }, [data, dataKey, referenceLine, referenceLabel, color]);

  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
      <h3 className="text-xl font-bold mb-4 text-white">{title}</h3>
      <p className="text-sm text-gray-400 mb-4">
        💡 마우스 스크롤: 확대/축소 | 클릭 드래그: 좌우 이동
      </p>

      <ReactECharts
        option={chartOption}
        style={{ height: '300px' }}
        opts={{ renderer: 'canvas' }}
      />

      <p className="mt-2 text-xs text-gray-400">
        * 차트 위에서 마우스 스크롤로 확대/축소, 클릭 드래그로 좌우 이동 가능
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
