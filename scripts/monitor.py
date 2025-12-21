#!/usr/bin/env python3
"""
Macro Risk Dashboard - Smart Monitoring System
Detects regime changes, threshold crossings, and divergence alerts
"""

import os
import json
import requests
from datetime import datetime
from typing import Optional, Dict, Any

# Configuration
DASHBOARD_URL = os.getenv('DASHBOARD_URL', 'https://macro-risk-dashboard-psi.vercel.app')
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID')
STATE_FILE = 'state.json'

# Regime thresholds (matching the dashboard)
REGIME_THRESHOLDS = {
    'riskOn': {'min': 0.00, 'max': 0.30, 'label': 'Risk-On', 'emoji': '🟢'},
    'neutral': {'min': 0.30, 'max': 0.55, 'label': 'Neutral', 'emoji': '🟡'},
    'riskOff': {'min': 0.55, 'max': 0.75, 'label': 'Risk-Off', 'emoji': '🟠'},
    'crisis': {'min': 0.75, 'max': 1.00, 'label': 'Crisis', 'emoji': '🔴'}
}

# Indicator thresholds for Tier 2 alerts
INDICATOR_THRESHOLDS = {
    't10y2y': {'critical': 0, 'label': '금리 역전', 'emoji': '⚠️'},
    'hyOas': {'critical': 6.0, 'label': 'HY OAS 상승', 'emoji': '📊'},
    'ismPmi': {'critical': 50, 'label': 'PMI 위축', 'emoji': '📉'},
    'unrate': {'critical': 4.5, 'label': '실업률 상승', 'emoji': '📈'}
}


def get_regime_from_score(score: float) -> str:
    """Determine regime from risk score"""
    if score < 0.30:
        return 'riskOn'
    elif score < 0.55:
        return 'neutral'
    elif score < 0.75:
        return 'riskOff'
    else:
        return 'crisis'


def load_state() -> Dict[str, Any]:
    """Load previous state from file"""
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    return {}


def save_state(state: Dict[str, Any]):
    """Save current state to file"""
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f, indent=2)


def fetch_dashboard_data() -> Optional[Dict[str, Any]]:
    """Fetch data from dashboard API"""
    try:
        # Fetch FRED data
        fred_response = requests.get(f'{DASHBOARD_URL}/api/fred', timeout=30)
        fred_data = fred_response.json()

        # Fetch Fear & Greed data
        fg_response = requests.get(f'{DASHBOARD_URL}/api/fear-greed', timeout=30)
        fg_data = fg_response.json()

        return {
            'fred': fred_data,
            'fearGreed': fg_data,
            'timestamp': datetime.utcnow().isoformat()
        }
    except Exception as e:
        print(f"Error fetching data: {e}")
        return None


def calculate_risk_score(fred_data: Dict) -> Optional[float]:
    """Calculate composite risk score from FRED data"""
    try:
        # Get latest values
        t10y2y = fred_data['t10y2y'][-1]['value']
        unrate = fred_data['unrate'][-1]['value']
        hyOas = fred_data['hyOas'][-1]['value']
        ismPmi = fred_data['ismPmi'][-1]['value']

        if any(v is None for v in [t10y2y, unrate, hyOas, ismPmi]):
            return None

        # Scoring functions (matching lib/risk-score.ts)
        def score_t10y2y(v):
            if v >= 0: return 0
            if v <= -1.0: return 1.0
            return abs(v) / 1.0

        def score_hyoas(v):
            if v <= 4.0: return 0
            if v >= 8.0: return 1.0
            return (v - 4.0) / 4.0

        def score_ismpmi(v):
            if v >= 50: return 0
            if v <= 43: return 1.0
            return (50 - v) / 7.0

        def score_unrate(v):
            if v <= 4.0: return 0
            if v >= 7.0: return 1.0
            return (v - 4.0) / 3.0

        # Weights
        weights = {
            't10y2y': 0.35,
            'hyOas': 0.30,
            'ismPmi': 0.20,
            'unrate': 0.15
        }

        # Calculate composite
        score = (
            score_t10y2y(t10y2y) * weights['t10y2y'] +
            score_hyoas(hyOas) * weights['hyOas'] +
            score_ismpmi(ismPmi) * weights['ismPmi'] +
            score_unrate(unrate) * weights['unrate']
        )

        return max(0, min(1, score))
    except Exception as e:
        print(f"Error calculating risk score: {e}")
        return None


def send_telegram_message(message: str):
    """Send message via Telegram"""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("Telegram credentials not configured")
        return

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    data = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "HTML"
    }

    try:
        response = requests.post(url, json=data, timeout=10)
        response.raise_for_status()
        print("Telegram message sent successfully")
    except Exception as e:
        print(f"Error sending Telegram message: {e}")


def check_tier1_alerts(current_score: float, prev_score: Optional[float]) -> Optional[str]:
    """Check for Tier 1: Regime changes"""
    if prev_score is None:
        return None

    current_regime = get_regime_from_score(current_score)
    prev_regime = get_regime_from_score(prev_score)

    if current_regime != prev_regime:
        curr_info = REGIME_THRESHOLDS[current_regime]
        prev_info = REGIME_THRESHOLDS[prev_regime]

        message = f"""🚨 <b>Macro Risk 레짐 변경</b>

{prev_info['emoji']} {prev_info['label']} → {curr_info['emoji']} {curr_info['label']}

현재 Risk Score: {current_score:.3f}
변경 시각: {datetime.now().strftime('%Y-%m-%d %H:%M')}

<b>권장 액션:</b>
"""

        # Add action recommendations based on new regime
        actions = {
            'riskOn': [
                '✅ 정상 투자 전략 유지',
                '✅ DCA 지속 가능',
                '✅ 성장주 비중 유지'
            ],
            'neutral': [
                '⚠️ DCA 중단 고려',
                '⚠️ 현금 비중 점검',
                '⚠️ 방어주 편입 검토'
            ],
            'riskOff': [
                '🔴 현금 비중 30% 이상 상향 검토',
                '🔴 방어 자산(채권, 금) 20% 편입 고려',
                '🔴 레버리지 포지션 축소'
            ],
            'crisis': [
                '🚨 풀헤지 진입 검토 권고',
                '🚨 현금 비중 50% 이상 고려',
                '🚨 신규 진입 중단'
            ]
        }

        for action in actions[current_regime]:
            message += f"\n{action}"

        return message

    return None


def check_tier2_alerts(fred_data: Dict, prev_state: Dict) -> list:
    """Check for Tier 2: Individual indicator threshold crossings"""
    alerts = []

    try:
        current_indicators = {
            't10y2y': fred_data['t10y2y'][-1]['value'],
            'hyOas': fred_data['hyOas'][-1]['value'],
            'ismPmi': fred_data['ismPmi'][-1]['value'],
            'unrate': fred_data['unrate'][-1]['value']
        }

        prev_indicators = prev_state.get('indicators', {})

        # Check T10Y2Y inversion
        if current_indicators['t10y2y'] is not None:
            if (current_indicators['t10y2y'] <= 0 and
                prev_indicators.get('t10y2y', 1) > 0):
                alerts.append(f"""⚠️ <b>T10Y2Y 금리 역전 발생</b>

현재 값: {current_indicators['t10y2y']:.2f}%
역사적으로 12-18개월 내 경기침체 신호""")

        # Check HY OAS
        if current_indicators['hyOas'] is not None:
            if (current_indicators['hyOas'] >= 6.0 and
                prev_indicators.get('hyOas', 0) < 6.0):
                alerts.append(f"""📊 <b>HY OAS 위험 수준 진입</b>

현재 값: {current_indicators['hyOas']:.2f}%
신용 위험 증가 신호""")

        # Check ISM PMI
        if current_indicators['ismPmi'] is not None:
            if (current_indicators['ismPmi'] < 50 and
                prev_indicators.get('ismPmi', 100) >= 50):
                alerts.append(f"""📉 <b>ISM PMI 위축 진입</b>

현재 값: {current_indicators['ismPmi']:.1f}
제조업 위축 신호""")

        # Check Unemployment
        if current_indicators['unrate'] is not None:
            if (current_indicators['unrate'] >= 4.5 and
                prev_indicators.get('unrate', 0) < 4.5):
                alerts.append(f"""📈 <b>실업률 상승</b>

현재 값: {current_indicators['unrate']:.1f}%
경제 둔화 가능성""")

        return alerts
    except Exception as e:
        print(f"Error checking Tier 2 alerts: {e}")
        return []


def check_divergence(risk_score: float, fg_data: Dict) -> Optional[str]:
    """Check for divergence between Macro Risk and Fear & Greed"""
    try:
        crypto_fg = fg_data.get('crypto')
        if not crypto_fg:
            return None

        fg_value = crypto_fg['value']

        # Divergence: Macro says Risk-Off but F&G says Extreme Greed
        if risk_score >= 0.55 and fg_value >= 75:
            return f"""⚠️ <b>신호 불일치 감지</b>

Macro Risk: Risk-Off ({risk_score:.2f})
Crypto F&G: Extreme Greed ({fg_value})

→ 거시경제는 위험한데 시장은 과열
→ 조정 가능성 높음"""

        # Divergence: Macro says Risk-On but F&G says Extreme Fear
        elif risk_score <= 0.30 and fg_value <= 25:
            return f"""💡 <b>매수 기회 신호</b>

Macro Risk: Risk-On ({risk_score:.2f})
Crypto F&G: Extreme Fear ({fg_value})

→ 거시경제는 안정적인데 시장은 공포
→ 매수 기회 가능성"""

        return None
    except Exception as e:
        print(f"Error checking divergence: {e}")
        return None


def generate_weekly_summary(data: Dict) -> str:
    """Generate weekly summary report"""
    try:
        fred_data = data['fred']
        fg_data = data['fearGreed']

        risk_score = calculate_risk_score(fred_data)
        regime = get_regime_from_score(risk_score) if risk_score else 'unknown'
        regime_info = REGIME_THRESHOLDS.get(regime, {'label': 'Unknown', 'emoji': '❓'})

        # Get indicator values
        t10y2y = fred_data['t10y2y'][-1]['value']
        hyOas = fred_data['hyOas'][-1]['value']
        ismPmi = fred_data['ismPmi'][-1]['value']
        unrate = fred_data['unrate'][-1]['value']

        crypto_fg = fg_data.get('crypto', {})
        stock_fg = fg_data.get('stock', {})

        message = f"""📊 <b>주간 Macro Risk 리뷰</b>

━━━━━━━━━━━━━━━━━━━━
<b>현재 상태</b>
{regime_info['emoji']} Regime: {regime_info['label']}
Risk Score: {risk_score:.3f}

<b>지표 현황</b>
• T10Y2Y: {t10y2y:.2f}% {'⚠️' if t10y2y <= 0 else '✅'}
• HY OAS: {hyOas:.2f}% {'⚠️' if hyOas >= 6.0 else '✅'}
• ISM PMI: {ismPmi:.1f} {'⚠️' if ismPmi < 50 else '✅'}
• 실업률: {unrate:.1f}% {'⚠️' if unrate >= 4.5 else '✅'}

<b>시장 심리</b>
🪙 Crypto F&G: {crypto_fg.get('value', 'N/A')} ({crypto_fg.get('label', 'N/A')})
📈 Stock F&G: {stock_fg.get('value', 'N/A')} ({stock_fg.get('label', 'N/A')})

━━━━━━━━━━━━━━━━━━━━
업데이트: {datetime.now().strftime('%Y-%m-%d %H:%M')}
"""

        return message
    except Exception as e:
        print(f"Error generating weekly summary: {e}")
        return "Error generating summary"


def main():
    """Main monitoring logic"""
    print(f"Starting monitoring at {datetime.now()}")

    # Load previous state
    prev_state = load_state()

    # Fetch current data
    data = fetch_dashboard_data()
    if not data:
        print("Failed to fetch data")
        return

    # Calculate current risk score
    risk_score = calculate_risk_score(data['fred'])
    if risk_score is None:
        print("Failed to calculate risk score")
        return

    print(f"Current Risk Score: {risk_score:.3f}")

    # Prepare current state
    current_state = {
        'score': risk_score,
        'regime': get_regime_from_score(risk_score),
        'indicators': {
            't10y2y': data['fred']['t10y2y'][-1]['value'],
            'hyOas': data['fred']['hyOas'][-1]['value'],
            'ismPmi': data['fred']['ismPmi'][-1]['value'],
            'unrate': data['fred']['unrate'][-1]['value']
        },
        'timestamp': data['timestamp']
    }

    # Check alerts
    alerts = []

    # Tier 1: Regime changes
    tier1_alert = check_tier1_alerts(risk_score, prev_state.get('score'))
    if tier1_alert:
        alerts.append(tier1_alert)

    # Tier 2: Indicator thresholds
    tier2_alerts = check_tier2_alerts(data['fred'], prev_state)
    alerts.extend(tier2_alerts)

    # Divergence detection
    divergence_alert = check_divergence(risk_score, data['fearGreed'])
    if divergence_alert:
        alerts.append(divergence_alert)

    # Send alerts
    for alert in alerts:
        send_telegram_message(alert)

    # Save current state
    save_state(current_state)

    print(f"Monitoring complete. Alerts sent: {len(alerts)}")


if __name__ == '__main__':
    main()
