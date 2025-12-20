#!/usr/bin/env python3
"""
Weekly Summary Report Generator
Sends comprehensive weekly market overview
"""

import os
import sys
import requests
from datetime import datetime

# Add parent directory to path to import from monitor.py
sys.path.insert(0, os.path.dirname(__file__))
from monitor import (
    DASHBOARD_URL,
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID,
    REGIME_THRESHOLDS,
    fetch_dashboard_data,
    calculate_risk_score,
    get_regime_from_score,
    send_telegram_message
)


def generate_weekly_summary(data: dict) -> str:
    """Generate comprehensive weekly summary"""
    try:
        fred_data = data['fred']
        fg_data = data['fearGreed']

        # Calculate risk score
        risk_score = calculate_risk_score(fred_data)
        if risk_score is None:
            return "⚠️ 데이터 계산 오류"

        regime = get_regime_from_score(risk_score)
        regime_info = REGIME_THRESHOLDS[regime]

        # Get indicator values
        t10y2y = fred_data['t10y2y'][-1]['value']
        hyOas = fred_data['hyOas'][-1]['value']
        ismPmi = fred_data['ismPmi'][-1]['value']
        unrate = fred_data['unrate'][-1]['value']

        # Get Fear & Greed values
        crypto_fg = fg_data.get('crypto', {})
        stock_fg = fg_data.get('stock', {})

        # Determine status emojis
        t10y2y_status = '⚠️' if (t10y2y and t10y2y <= 0) else '✅'
        hyoas_status = '⚠️' if (hyOas and hyOas >= 6.0) else '✅'
        ismpmi_status = '⚠️' if (ismPmi and ismPmi < 50) else '✅'
        unrate_status = '⚠️' if (unrate and unrate >= 4.5) else '✅'

        # Build message
        message = f"""📊 <b>주간 Macro Risk 리뷰</b>

━━━━━━━━━━━━━━━━━━━━
<b>🎯 현재 상태</b>
{regime_info['emoji']} Regime: <b>{regime_info['label']}</b>
Risk Score: <b>{risk_score:.3f}</b>

<b>📈 거시 지표</b>
{t10y2y_status} T10Y2Y: {t10y2y:.2f}%{' (역전!)' if t10y2y <= 0 else ''}
{hyoas_status} HY OAS: {hyOas:.2f}%
{ismpmi_status} ISM PMI: {ismPmi:.1f}
{unrate_status} 실업률: {unrate:.1f}%

<b>💹 시장 심리</b>
🪙 Crypto F&G: {crypto_fg.get('value', 'N/A')} ({crypto_fg.get('label', 'N/A')})
📈 Stock F&G: {stock_fg.get('value', 'N/A')} ({stock_fg.get('label', 'N/A')})

━━━━━━━━━━━━━━━━━━━━
<b>💡 권장 액션</b>
"""

        # Add action recommendations
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
                '🔴 현금 비중 30% 이상 상향',
                '🔴 방어 자산 20% 편입 고려',
                '🔴 레버리지 포지션 축소'
            ],
            'crisis': [
                '🚨 풀헤지 진입 검토',
                '🚨 현금 비중 50% 이상',
                '🚨 신규 진입 중단'
            ]
        }

        for action in actions[regime]:
            message += f"\n{action}"

        message += f"""

━━━━━━━━━━━━━━━━━━━━
⏰ {datetime.now().strftime('%Y년 %m월 %d일 %H:%M')}
📊 <a href="{DASHBOARD_URL}">대시보드 보기</a>"""

        return message

    except Exception as e:
        return f"⚠️ 요약 생성 오류: {str(e)}"


def main():
    """Generate and send weekly summary"""
    print(f"Generating weekly summary at {datetime.now()}")

    # Fetch data
    data = fetch_dashboard_data()
    if not data:
        print("Failed to fetch data")
        return

    # Generate summary
    summary = generate_weekly_summary(data)

    # Send to Telegram
    send_telegram_message(summary)

    print("Weekly summary sent successfully")


if __name__ == '__main__':
    main()
