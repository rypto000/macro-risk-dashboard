#!/usr/bin/env python3
"""
Macro Risk Dashboard - Smart Monitoring System
Detects Fear & Greed regime changes and indicator threshold crossings
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

# Indicator thresholds for Tier 2 alerts
INDICATOR_THRESHOLDS = {
    't10y2y': {'critical': 0, 'label': '금리 역전', 'emoji': '⚠️'},
    'hyOas': {'critical': 6.0, 'label': 'HY OAS 상승', 'emoji': '📊'},
    'ismPmi': {'critical': 50, 'label': 'PMI 위축', 'emoji': '📉'},
    'unrate': {'critical': 4.5, 'label': '실업률 상승', 'emoji': '📈'}
}

# Fear & Greed label to emoji mapping (using original API labels)
FG_LABEL_EMOJI = {
    'extreme fear': '🔴',
    'fear': '🟠',
    'neutral': '🟡',
    'greed': '🟢',
    'extreme greed': '🟢🟢'
}


def normalize_fg_label(label: str) -> str:
    """Normalize Fear & Greed label (title case for display)"""
    if not label:
        return label
    # Convert to lowercase for comparison, then title case for display
    label_lower = label.lower()
    if label_lower == 'extreme fear':
        return 'Extreme Fear'
    elif label_lower == 'extreme greed':
        return 'Extreme Greed'
    else:
        return label.title()


def get_fg_emoji(label: str) -> str:
    """Get emoji for Fear & Greed label from original API (case-insensitive)"""
    if not label:
        return '❓'
    return FG_LABEL_EMOJI.get(label.lower(), '❓')


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


def check_regime_changes(fg_data: Dict, prev_state: Dict) -> Optional[str]:
    """Check for Fear & Greed regime changes"""
    changes = []

    # Check Crypto Fear & Greed regime change (using original API label)
    crypto_fg = fg_data.get('crypto')
    if crypto_fg:
        current_crypto_label = crypto_fg['label']
        prev_crypto_label = prev_state.get('crypto_fg_label')

        # Compare labels (case-insensitive)
        if prev_crypto_label and current_crypto_label.lower() != prev_crypto_label.lower():
            changes.append({
                'type': 'crypto_fg',
                'prev': {'label': normalize_fg_label(prev_crypto_label), 'emoji': get_fg_emoji(prev_crypto_label)},
                'curr': {'label': normalize_fg_label(current_crypto_label), 'emoji': get_fg_emoji(current_crypto_label)},
                'value': crypto_fg['value']
            })

    # Check Stock Fear & Greed regime change (using original API label)
    stock_fg = fg_data.get('stock')
    if stock_fg:
        current_stock_label = stock_fg['label']
        prev_stock_label = prev_state.get('stock_fg_label')

        # Compare labels (case-insensitive)
        if prev_stock_label and current_stock_label.lower() != prev_stock_label.lower():
            changes.append({
                'type': 'stock_fg',
                'prev': {'label': normalize_fg_label(prev_stock_label), 'emoji': get_fg_emoji(prev_stock_label)},
                'curr': {'label': normalize_fg_label(current_stock_label), 'emoji': get_fg_emoji(current_stock_label)},
                'value': stock_fg['value']
            })

    # If no changes, return None
    if not changes:
        return None

    # Build combined message
    if len(changes) == 1:
        # Single regime change
        change = changes[0]
        if change['type'] == 'crypto_fg':
            message = f"""🪙 <b>Crypto Fear & Greed 변경</b>

{change['prev']['emoji']} {change['prev']['label']} → {change['curr']['emoji']} {change['curr']['label']}

현재 값: {change['value']}
변경 시각: {datetime.now().strftime('%Y-%m-%d %H:%M')}

Source: Alternative.me"""

        else:  # stock_fg
            message = f"""📈 <b>Stock Fear & Greed 변경</b>

{change['prev']['emoji']} {change['prev']['label']} → {change['curr']['emoji']} {change['curr']['label']}

현재 값: {change['value']}
변경 시각: {datetime.now().strftime('%Y-%m-%d %H:%M')}

Source: CNN"""

    else:
        # Multiple regime changes - combined message
        message = f"""🚨 <b>복합 F&G 변경</b>

변경 시각: {datetime.now().strftime('%Y-%m-%d %H:%M')}

"""
        for change in changes:
            if change['type'] == 'crypto_fg':
                message += f"""<b>🪙 Crypto F&G</b>
{change['prev']['emoji']} {change['prev']['label']} → {change['curr']['emoji']} {change['curr']['label']}
값: {change['value']}
(Source: Alternative.me)

"""
            else:  # stock_fg
                message += f"""<b>📈 Stock F&G</b>
{change['prev']['emoji']} {change['prev']['label']} → {change['curr']['emoji']} {change['curr']['label']}
값: {change['value']}
(Source: CNN)

"""

    return message


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




def generate_weekly_summary(data: Dict) -> str:
    """Generate weekly summary report"""
    try:
        fred_data = data['fred']
        fg_data = data['fearGreed']

        # Get indicator values
        t10y2y = fred_data['t10y2y'][-1]['value']
        hyOas = fred_data['hyOas'][-1]['value']
        ismPmi = fred_data['ismPmi'][-1]['value']
        unrate = fred_data['unrate'][-1]['value']

        crypto_fg = fg_data.get('crypto', {})
        stock_fg = fg_data.get('stock', {})

        message = f"""📊 <b>주간 리뷰</b>

━━━━━━━━━━━━━━━━━━━━
<b>거시경제 지표</b>
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

    # Get current Fear & Greed labels from API (original source)
    crypto_fg = data['fearGreed'].get('crypto', {})
    stock_fg = data['fearGreed'].get('stock', {})

    current_crypto_label = crypto_fg.get('label') if crypto_fg else None
    current_stock_label = stock_fg.get('label') if stock_fg else None

    print(f"Crypto F&G: {crypto_fg.get('value')} ({current_crypto_label})")
    print(f"Stock F&G: {stock_fg.get('value')} ({current_stock_label})")

    # Prepare current state
    current_state = {
        'crypto_fg_label': current_crypto_label,
        'stock_fg_label': current_stock_label,
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

    # Tier 1: Fear & Greed regime changes
    regime_alert = check_regime_changes(data['fearGreed'], prev_state)
    if regime_alert:
        alerts.append(regime_alert)

    # Tier 2: Indicator thresholds
    tier2_alerts = check_tier2_alerts(data['fred'], prev_state)
    alerts.extend(tier2_alerts)

    # Send alerts
    for alert in alerts:
        send_telegram_message(alert)

    # Save current state
    save_state(current_state)

    print(f"Monitoring complete. Alerts sent: {len(alerts)}")


if __name__ == '__main__':
    main()
