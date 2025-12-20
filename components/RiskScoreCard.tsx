'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  REGIME_THRESHOLDS,
  ACTION_RECOMMENDATIONS,
  RegimeType
} from '../lib/risk-score';

interface RiskScoreCardProps {
  currentScore: number;
  currentRegime: RegimeType;
  historicalScores: { date: string; score: number | null }[];
  lastRegimeChange?: string;
}

export default function RiskScoreCard({
  currentScore,
  currentRegime,
  historicalScores,
  lastRegimeChange
}: RiskScoreCardProps) {
  const regimeInfo = REGIME_THRESHOLDS[currentRegime];
  const actions = ACTION_RECOMMENDATIONS[currentRegime];

  // Get last 36 months (3 years) of data for sparkline
  const last36Months = useMemo(() => {
    return historicalScores.slice(-36);
  }, [historicalScores]);

  // Sparkline chart option
  const sparklineOption = useMemo(() => {
    const dates = last36Months.map(d => d.date);
    const scores = last36Months.map(d => d.score);

    return {
      grid: {
        left: 0,
        right: 0,
        top: 5,
        bottom: 20,
        containLabel: false
      },
      xAxis: {
        type: 'category',
        data: dates,
        show: false
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 1,
        show: false
      },
      series: [
        {
          type: 'line',
          data: scores,
          smooth: true,
          symbol: 'none',
          connectNulls: false, // Don't connect across null gaps
          lineStyle: {
            color: regimeInfo.color === 'green' ? '#10b981' :
                   regimeInfo.color === 'yellow' ? '#f59e0b' :
                   regimeInfo.color === 'orange' ? '#f97316' : '#ef4444',
            width: 2
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: regimeInfo.color === 'green' ? 'rgba(16, 185, 129, 0.3)' :
                         regimeInfo.color === 'yellow' ? 'rgba(245, 158, 11, 0.3)' :
                         regimeInfo.color === 'orange' ? 'rgba(249, 115, 22, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                },
                {
                  offset: 1,
                  color: 'rgba(0, 0, 0, 0)'
                }
              ]
            }
          }
        }
      ],
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
            month: 'long'
          });
          // Handle null values
          if (param.value === null || param.value === undefined) {
            return `${dateStr}<br/>Risk Score: N/A`;
          }
          return `${dateStr}<br/>Risk Score: ${param.value.toFixed(3)}`;
        }
      }
    };
  }, [last36Months, regimeInfo.color]);

  // Gauge chart for current score
  const gaugeOption = useMemo(() => {
    return {
      series: [
        {
          type: 'gauge',
          startAngle: 180,
          endAngle: 0,
          min: 0,
          max: 1,
          splitNumber: 4,
          axisLine: {
            lineStyle: {
              width: 20,
              color: [
                [0.30, '#ef4444'],
                [0.55, '#f59e0b'],
                [0.75, '#f97316'],
                [1.0, '#10b981']
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
            fontSize: 12,
            formatter: function(value: number) {
              return value.toFixed(1);
            }
          },
          detail: {
            valueAnimation: true,
            formatter: function(value: number) {
              return value.toFixed(2);
            },
            color: '#ffffff',
            fontSize: 32,
            fontWeight: 'bold',
            offsetCenter: [0, '70%']
          },
          data: [
            {
              value: currentScore,
              name: regimeInfo.label,
              title: {
                offsetCenter: [0, '90%'],
                fontSize: 18,
                color: regimeInfo.color === 'green' ? '#10b981' :
                       regimeInfo.color === 'yellow' ? '#f59e0b' :
                       regimeInfo.color === 'orange' ? '#f97316' : '#ef4444'
              }
            }
          ]
        }
      ]
    };
  }, [currentScore, regimeInfo]);

  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
      <h2 className="text-2xl font-bold mb-6 text-white">
        🎯 Composite Risk Score
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Gauge */}
        <div>
          <ReactECharts
            option={gaugeOption}
            style={{ height: '280px' }}
            opts={{ renderer: 'canvas' }}
          />

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-400">
              {regimeInfo.description}
            </p>
            {lastRegimeChange && (
              <p className="text-xs text-gray-500 mt-2">
                최근 레짐 전환: {new Date(lastRegimeChange).toLocaleDateString('ko-KR')}
              </p>
            )}
          </div>
        </div>

        {/* Right: Sparkline + Actions */}
        <div className="flex flex-col">
          {/* Sparkline */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">
              📈 최근 3년 추이
            </h3>
            <ReactECharts
              option={sparklineOption}
              style={{ height: '120px' }}
              opts={{ renderer: 'canvas' }}
            />
          </div>

          {/* Action Recommendations */}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              💡 권장 액션 (자동 제안)
            </h3>
            <div className="space-y-2">
              {actions.map((action, index) => (
                <div
                  key={index}
                  className="bg-slate-900 p-3 rounded border border-slate-700 text-sm text-gray-300"
                >
                  {action}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Regime Legend */}
      <div className="mt-6 pt-4 border-t border-slate-700">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-400">Risk-On (0.00~0.30)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-gray-400">Neutral (0.30~0.55)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-gray-400">Risk-Off (0.55~0.75)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-400">Crisis (0.75~1.00)</span>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        * 이 지표는 예측 모델이 아니라 리스크 컨트롤러입니다. 위험 구간에서 멍청한 행동을 방지하는 것이 목적입니다.
        <br />
        * 액션은 자동 실행이 아닌 자동 제안입니다. 최종 결정은 사용자가 합니다.
      </p>
    </div>
  );
}
