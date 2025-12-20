/**
 * Risk Score Calculation System
 * Purpose: Risk Controller (not predictor)
 * Design: Based on expert consultation
 */

interface DataPoint {
  date: string;
  value: number | null;
}

// 1. Continuous Score Functions (0.0 ~ 1.0)
// Linear mapping for interpretability

export function scoreT10Y2Y(value: number | null): number {
  if (value === null) return 0;
  if (value >= 0) return 0;
  if (value <= -1.0) return 1.0;
  return Math.abs(value) / 1.0;
}

export function scoreHyOas(value: number | null): number {
  if (value === null) return 0;
  if (value <= 4.0) return 0;
  if (value >= 8.0) return 1.0;
  return (value - 4.0) / 4.0;
}

export function scoreIsmPmi(value: number | null): number {
  if (value === null) return 0;
  if (value >= 50) return 0;
  if (value <= 43) return 1.0;
  return (50 - value) / 7.0;
}

export function scoreUnrate(value: number | null): number {
  if (value === null) return 0;
  if (value <= 4.0) return 0;
  if (value >= 7.0) return 1.0;
  return (value - 4.0) / 3.0;
}

// 2. Weights (historically validated hierarchy)
export const WEIGHTS = {
  t10y2y: 0.35,  // Strongest leading indicator
  hyOas: 0.30,   // Real-time financial stress
  ismPmi: 0.20,  // Economic phase confirmation
  unrate: 0.15   // Lagging confirmation
} as const;

// 3. Regime Thresholds with Hysteresis
export const REGIME_THRESHOLDS = {
  riskOn: {
    enter: 0.25,
    exit: 0.35,
    label: 'Risk-On',
    color: 'red',
    description: '낮은 위험. 공격적 포지션 유지 가능'
  },
  neutral: {
    enter: 0.35,
    exit: 0.55,
    label: 'Neutral',
    color: 'yellow',
    description: '중립. 헤지 준비 및 포지션 검토'
  },
  riskOff: {
    enter: 0.55,
    exit: 0.75,
    label: 'Risk-Off',
    color: 'orange',
    description: '높은 위험. 방어적 포지션 전환'
  },
  crisis: {
    enter: 0.75,
    exit: Infinity,
    label: 'Crisis',
    color: 'green',
    description: '위기 구간. 풀헤지 검토 필요'
  }
} as const;

export type RegimeType = 'riskOn' | 'neutral' | 'riskOff' | 'crisis';

// 4. Composite Risk Score Calculation
export function calculateCompositeScore(
  t10y2y: number | null,
  hyOas: number | null,
  ismPmi: number | null,
  unrate: number | null
): number {
  const scores = {
    t10y2y: scoreT10Y2Y(t10y2y),
    hyOas: scoreHyOas(hyOas),
    ismPmi: scoreIsmPmi(ismPmi),
    unrate: scoreUnrate(unrate)
  };

  const compositeScore =
    scores.t10y2y * WEIGHTS.t10y2y +
    scores.hyOas * WEIGHTS.hyOas +
    scores.ismPmi * WEIGHTS.ismPmi +
    scores.unrate * WEIGHTS.unrate;

  return Math.max(0, Math.min(1, compositeScore));
}

// 5. Regime Detection with Hysteresis
export function detectRegime(
  currentScore: number,
  previousRegime: RegimeType | null
): RegimeType {
  // If no previous regime, determine based on current score
  if (!previousRegime) {
    if (currentScore < 0.35) return 'riskOn';
    if (currentScore < 0.55) return 'neutral';
    if (currentScore < 0.75) return 'riskOff';
    return 'crisis';
  }

  // Apply hysteresis based on previous regime
  switch (previousRegime) {
    case 'riskOn':
      if (currentScore >= REGIME_THRESHOLDS.neutral.enter) return 'neutral';
      return 'riskOn';

    case 'neutral':
      if (currentScore < REGIME_THRESHOLDS.riskOn.exit) return 'riskOn';
      if (currentScore >= REGIME_THRESHOLDS.riskOff.enter) return 'riskOff';
      return 'neutral';

    case 'riskOff':
      if (currentScore < REGIME_THRESHOLDS.neutral.exit) return 'neutral';
      if (currentScore >= REGIME_THRESHOLDS.crisis.enter) return 'crisis';
      return 'riskOff';

    case 'crisis':
      if (currentScore < REGIME_THRESHOLDS.riskOff.exit) return 'riskOff';
      return 'crisis';

    default:
      return 'neutral';
  }
}

// 6. Action Recommendations
export const ACTION_RECOMMENDATIONS: Record<RegimeType, string[]> = {
  riskOn: [
    '✅ 정상 투자 전략 유지',
    '✅ DCA 지속 가능',
    '✅ 성장주 비중 유지'
  ],
  neutral: [
    '⚠️ DCA 중단 고려',
    '⚠️ 현금 비중 점검',
    '⚠️ 방어주 편입 검토'
  ],
  riskOff: [
    '🔴 현금 비중 30% 이상 상향 검토',
    '🔴 방어 자산(채권, 금) 20% 편입 고려',
    '🔴 레버리지 포지션 축소'
  ],
  crisis: [
    '🚨 풀헤지 진입 검토 권고',
    '🚨 현금 비중 50% 이상 고려',
    '🚨 신규 진입 중단'
  ]
};

// 7. Calculate historical scores for sparkline (monthly, with forward fill)
export function calculateHistoricalScores(
  t10y2yData: DataPoint[],
  unrateData: DataPoint[],
  ismPmiData: DataPoint[],
  hyOasData: DataPoint[]
): { date: string; score: number | null }[] {
  // Sort all series by date (ascending)
  const sortedT10y2y = [...t10y2yData].sort((a, b) => a.date.localeCompare(b.date));
  const sortedUnrate = [...unrateData].sort((a, b) => a.date.localeCompare(b.date));
  const sortedIsmPmi = [...ismPmiData].sort((a, b) => a.date.localeCompare(b.date));
  const sortedHyOas = [...hyOasData].sort((a, b) => a.date.localeCompare(b.date));

  // Generate 36 month-end reference dates (last 3 years)
  const monthlyDates: string[] = [];
  const now = new Date();

  for (let i = 0; i < 36; i++) {
    const year = now.getFullYear();
    const month = now.getMonth() - i;

    // Get last day of the month
    const lastDay = new Date(year, month + 1, 0);
    monthlyDates.push(lastDay.toISOString().split('T')[0]);
  }

  monthlyDates.reverse(); // Oldest to newest

  // Forward fill state: pointer + last observed value
  const state = {
    t10y2y: { index: 0, lastValue: null as number | null },
    unrate: { index: 0, lastValue: null as number | null },
    ismPmi: { index: 0, lastValue: null as number | null },
    hyOas: { index: 0, lastValue: null as number | null }
  };

  // Helper: Forward fill to target date (date ≤ D의 마지막 값)
  function forwardFill(
    series: DataPoint[],
    targetDate: string,
    state: { index: number; lastValue: number | null }
  ): number | null {
    // Advance pointer while date ≤ targetDate
    while (state.index < series.length && series[state.index].date <= targetDate) {
      const value = series[state.index].value;
      if (value !== null) {
        state.lastValue = value;
      }
      state.index++;
    }
    return state.lastValue;
  }

  // Calculate score for each monthly date
  return monthlyDates.map(date => {
    const t10y2y = forwardFill(sortedT10y2y, date, state.t10y2y);
    const unrate = forwardFill(sortedUnrate, date, state.unrate);
    const ismPmi = forwardFill(sortedIsmPmi, date, state.ismPmi);
    const hyOas = forwardFill(sortedHyOas, date, state.hyOas);

    // CRITICAL: If ANY indicator is null, return null score (NOT 0)
    if (t10y2y === null || unrate === null || ismPmi === null || hyOas === null) {
      return { date, score: null };
    }

    const score = calculateCompositeScore(t10y2y, hyOas, ismPmi, unrate);
    return { date, score };
  });
}
