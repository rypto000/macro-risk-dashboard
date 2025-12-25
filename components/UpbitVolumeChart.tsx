'use client';

import { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

interface VolumeDataPoint {
  date: string;
  volume: number;
  volumeTrillion: number;
  ma7: number;
  ma30: number;
  ma90: number;
}

interface ChartMarker {
  id: string;
  date: string;
  label: string;
  color: string;
  description?: string;
}

interface UpbitVolumeChartProps {
  data: VolumeDataPoint[];
  latest?: {
    date: string;
    volumeTrillion: number;
    ma90: number;
    status: 'normal' | 'overheated' | 'cold';
    percentile?: number;
  };
  statistics?: {
    average: number;
    median: number;
    min: number;
    max: number;
    percentiles: {
      p10: number;
      p25: number;
      p50: number;
      p75: number;
      p90: number;
      p95: number;
    };
  };
  markers?: ChartMarker[];
}

export default function UpbitVolumeChart({ data, latest, statistics, markers = [] }: UpbitVolumeChartProps) {
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);

  // 차트 옵션 생성
  const chartOption = useMemo(() => {
    if (!data || data.length === 0) {
      return {};
    }

    const dates = data.map(d => d.date);
    const volumes = data.map(d => d.volumeTrillion);
    const ma7 = data.map(d => d.ma7);
    const ma30 = data.map(d => d.ma30);
    const ma90 = data.map(d => d.ma90);

    // 막대 색상 결정 (과열/정상/냉각)
    const barColors = data.map(d => {
      if (d.ma90 === 0) return '#6b7280'; // 회색 (정상)

      const ratio = d.volume / (d.ma90 * 1_000_000_000_000);
      if (ratio >= 2.0) return '#ef4444'; // 빨강 (과열)
      if (ratio <= 0.5) return '#3b82f6'; // 파랑 (냉각)
      return '#6b7280'; // 회색 (정상)
    });

    // 동적 마커 라인 생성
    const markLines = markers.map(marker => ({
      name: marker.label,
      xAxis: marker.date,
      lineStyle: { color: marker.color, type: 'dashed' as const, width: 2 },
      label: {
        show: true,
        position: 'insideEndTop' as const,
        formatter: marker.label,
        color: marker.color
      }
    }));

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(51, 65, 85, 0.95)',
        borderColor: '#475569',
        textStyle: {
          color: '#e5e7eb'
        },
        formatter: function(params: any) {
          const date = params[0].axisValue;
          let result = `<div style="font-weight: bold; margin-bottom: 8px;">${date}</div>`;

          params.forEach((param: any) => {
            if (param.seriesName === '거래대금') {
              result += `<div style="margin: 4px 0;">
                <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background-color:${param.color};margin-right:8px;"></span>
                ${param.seriesName}: <strong>${param.value.toFixed(2)}조원</strong>
              </div>`;
            } else {
              result += `<div style="margin: 4px 0;">
                <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background-color:${param.color};margin-right:8px;"></span>
                ${param.seriesName}: ${param.value.toFixed(2)}조원
              </div>`;
            }
          });

          return result;
        }
      },
      legend: {
        data: ['거래대금', 'MA7 (7일)', 'MA30 (30일)', 'MA90 (90일)'],
        textStyle: {
          color: '#e5e7eb'
        },
        top: 10
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: 60,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: {
          lineStyle: {
            color: '#475569'
          }
        },
        axisLabel: {
          color: '#94a3b8',
          formatter: function(value: string) {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }
        }
      },
      yAxis: {
        type: 'value',
        name: '조원',
        nameTextStyle: {
          color: '#94a3b8'
        },
        axisLine: {
          lineStyle: {
            color: '#475569'
          }
        },
        axisLabel: {
          color: '#94a3b8',
          formatter: '{value}'
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
          name: '거래대금',
          type: 'bar',
          data: volumes,
          itemStyle: {
            color: function(params: any) {
              return barColors[params.dataIndex];
            }
          },
          markLine: {
            silent: true,
            symbol: 'none',
            data: markLines
          }
        },
        {
          name: 'MA7 (7일)',
          type: 'line',
          data: ma7,
          smooth: true,
          lineStyle: {
            color: '#60a5fa',
            width: 2
          },
          itemStyle: {
            color: '#60a5fa'
          },
          showSymbol: false
        },
        {
          name: 'MA30 (30일)',
          type: 'line',
          data: ma30,
          smooth: true,
          lineStyle: {
            color: '#fbbf24',
            width: 2
          },
          itemStyle: {
            color: '#fbbf24'
          },
          showSymbol: false
        },
        {
          name: 'MA90 (90일)',
          type: 'line',
          data: ma90,
          smooth: true,
          lineStyle: {
            color: '#f87171',
            width: 2
          },
          itemStyle: {
            color: '#f87171'
          },
          showSymbol: false
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100
        },
        {
          start: 0,
          end: 100,
          handleStyle: {
            color: '#475569'
          },
          textStyle: {
            color: '#94a3b8'
          },
          borderColor: '#475569'
        }
      ]
    };
  }, [data, markers]);

  // 현재 상태 표시
  const getStatusBadge = () => {
    if (!latest) return null;

    const statusConfig = {
      overheated: {
        bg: 'bg-red-500/20',
        text: 'text-red-400',
        label: '🔥 과열',
        desc: '90일 평균 대비 200% 이상'
      },
      cold: {
        bg: 'bg-blue-500/20',
        text: 'text-blue-400',
        label: '❄️ 냉각',
        desc: '90일 평균 대비 50% 이하'
      },
      normal: {
        bg: 'bg-gray-500/20',
        text: 'text-gray-400',
        label: '📊 정상',
        desc: '정상 범위'
      }
    };

    const config = statusConfig[latest.status];

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bg}`}>
        <span className={`font-semibold ${config.text}`}>{config.label}</span>
        <span className="text-xs text-slate-400">({config.desc})</span>
      </div>
    );
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 shadow-lg">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            📊 업비트 거래대금
            <span className="text-sm font-normal text-slate-400">(암호화폐 시장 온도)</span>
          </h3>
          {latest && (
            <div className="mt-2 space-y-3">
              <div className="flex items-center gap-4">
                <div className="text-sm text-slate-300">
                  현재: <span className="text-lg font-bold text-white">{latest.volumeTrillion.toFixed(2)}조원</span>
                </div>
                {getStatusBadge()}
              </div>

              {/* 백분위수 정보 */}
              {latest.percentile !== undefined && statistics && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">역사적 위치 (4년 기준):</span>
                    <span className={`text-sm font-bold ${
                      latest.percentile >= 90 ? 'text-red-400' :
                      latest.percentile >= 75 ? 'text-orange-400' :
                      latest.percentile >= 50 ? 'text-yellow-400' :
                      latest.percentile >= 25 ? 'text-green-400' :
                      'text-blue-400'
                    }`}>
                      {latest.percentile.toFixed(1)}th percentile
                    </span>
                  </div>

                  {/* 백분위수 바 */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden relative">
                      {/* 구간별 색상 배경 */}
                      <div className="absolute inset-0 flex">
                        <div className="bg-blue-500/30" style={{width: '25%'}}></div>
                        <div className="bg-green-500/30" style={{width: '25%'}}></div>
                        <div className="bg-yellow-500/30" style={{width: '25%'}}></div>
                        <div className="bg-orange-500/30" style={{width: '15%'}}></div>
                        <div className="bg-red-500/30" style={{width: '10%'}}></div>
                      </div>
                      {/* 현재 위치 */}
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
                        style={{left: `${latest.percentile}%`}}
                      ></div>
                    </div>
                  </div>

                  {/* 설명 텍스트 */}
                  <div className="text-xs text-slate-400">
                    {latest.percentile >= 90 ? (
                      <span className="text-red-300">🔴 상위 {(100 - latest.percentile).toFixed(0)}% - 역사적 고점 수준</span>
                    ) : latest.percentile >= 75 ? (
                      <span className="text-orange-300">🟠 상위 {(100 - latest.percentile).toFixed(0)}% - 과열 구간</span>
                    ) : latest.percentile >= 50 ? (
                      <span className="text-yellow-300">🟡 평균 이상 ({latest.percentile.toFixed(0)}%)</span>
                    ) : latest.percentile >= 25 ? (
                      <span className="text-green-300">🟢 정상 범위 ({latest.percentile.toFixed(0)}%)</span>
                    ) : (
                      <span className="text-blue-300">🔵 하위 {latest.percentile.toFixed(0)}% - 저점 구간</span>
                    )}
                    <span className="ml-2">
                      (평균 {statistics.average.toFixed(2)}조 대비 {((latest.volumeTrillion / statistics.average - 1) * 100).toFixed(0)}%)
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => setIsExplanationOpen(!isExplanationOpen)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          {isExplanationOpen ? '▲' : '▼'} 설명
        </button>
      </div>

      {/* 설명 패널 */}
      {isExplanationOpen && (
        <div className="mb-4 p-4 bg-slate-700/50 rounded-lg text-sm text-slate-300 space-y-2">
          <p><strong className="text-white">📈 지표 설명:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>업비트 전체 KRW 마켓의 24시간 거래대금 합계</li>
            <li><span className="text-red-400">🔴 빨간 막대</span>: 과열 (90일 평균의 200% 이상, 투기 열풍)</li>
            <li><span className="text-blue-400">🔵 파란 막대</span>: 냉각 (90일 평균의 50% 이하, 시장 무관심)</li>
            <li><span className="text-gray-400">⚪ 회색 막대</span>: 정상 범위</li>
          </ul>
          <p className="mt-3"><strong className="text-white">📊 이동평균선:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><span className="text-blue-300">파란선 (MA7)</span>: 최근 7일 평균 - 단기 추세</li>
            <li><span className="text-yellow-300">노란선 (MA30)</span>: 최근 30일 평균 - 중기 추세</li>
            <li><span className="text-red-300">빨간선 (MA90)</span>: 최근 90일 평균 - 장기 추세</li>
          </ul>
          <p className="mt-3"><strong className="text-white">💡 활용법:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>거래대금 급증 = 리테일 투자자 유입 증가 (과열 주의)</li>
            <li>거래대금 급감 = 시장 관심도 하락 (바닥 시그널 가능)</li>
            <li>21년/25년 불장 참고선으로 역사적 패턴 비교</li>
          </ul>
        </div>
      )}

      {/* 차트 */}
      {data && data.length > 0 ? (
        <ReactECharts
          option={chartOption}
          style={{ height: '400px' }}
          theme="dark"
        />
      ) : (
        <div className="h-[400px] flex items-center justify-center text-slate-400">
          데이터를 불러오는 중...
        </div>
      )}

      {/* 범례 설명 */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>과열 (200%↑)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-500 rounded"></div>
          <span>정상</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span>냉각 (50%↓)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-yellow-400"></div>
          <span>불장 마킹</span>
        </div>
      </div>
    </div>
  );
}
