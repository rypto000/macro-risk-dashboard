#!/usr/bin/env python3
"""
업비트 일일 거래대금 수집 스크립트

매일 실행되어 전체 KRW 마켓의 24시간 거래대금을 수집하고
data/upbit_volume_history.json에 저장합니다.

Usage:
    python3 scripts/collect_upbit_volume.py
"""

import os
import sys
import json
import requests
from datetime import datetime, timezone, timedelta
from pathlib import Path

# 프로젝트 루트 디렉토리
PROJECT_ROOT = Path(__file__).parent.parent
DATA_FILE = PROJECT_ROOT / "data" / "upbit_volume_history.json"


def get_kst_date():
    """현재 KST 날짜 반환 (YYYY-MM-DD 형식)"""
    kst = timezone(timedelta(hours=9))
    now_kst = datetime.now(kst)
    return now_kst.strftime("%Y-%m-%d")


def get_upbit_total_volume():
    """업비트 API로 전체 KRW 마켓 24시간 거래대금 계산"""

    try:
        # 1. 전체 마켓 리스트 조회
        print("📊 마켓 리스트 조회 중...")
        markets_response = requests.get(
            'https://api.upbit.com/v1/market/all',
            timeout=10
        )
        markets_response.raise_for_status()
        markets = markets_response.json()

        # KRW 마켓만 필터링
        krw_markets = [m['market'] for m in markets if m['market'].startswith('KRW-')]
        print(f"✅ KRW 마켓 개수: {len(krw_markets)}개")

        # 2. 전체 ticker 정보 조회 (100개씩 배치)
        print("💰 거래대금 조회 중...")
        all_tickers = []
        batch_size = 100

        for i in range(0, len(krw_markets), batch_size):
            batch = krw_markets[i:i+batch_size]
            params = {'markets': ','.join(batch)}

            response = requests.get(
                'https://api.upbit.com/v1/ticker',
                params=params,
                timeout=10
            )
            response.raise_for_status()
            tickers = response.json()
            all_tickers.extend(tickers)

        # 3. 거래대금 합산
        total_volume = sum(
            ticker.get('acc_trade_price_24h', 0)
            for ticker in all_tickers
        )

        print(f"💵 전체 거래대금: {total_volume:,.0f}원 ({total_volume/1_000_000_000_000:.2f}조원)")

        return int(total_volume)

    except requests.exceptions.RequestException as e:
        print(f"❌ API 요청 실패: {e}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"❌ 오류 발생: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return None


def load_history():
    """기존 히스토리 데이터 로드"""

    if not DATA_FILE.exists():
        print("📁 히스토리 파일이 없습니다. 새로 생성합니다.")
        return {}

    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            print(f"📁 기존 데이터: {len(data)}개 레코드")
            return data
    except Exception as e:
        print(f"⚠️ 히스토리 로드 실패: {e}", file=sys.stderr)
        return {}


def save_history(history):
    """히스토리 데이터 저장"""

    # data 디렉토리가 없으면 생성
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)

    try:
        # 날짜 순으로 정렬
        sorted_history = dict(sorted(history.items()))

        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(sorted_history, f, indent=2, ensure_ascii=False)

        print(f"✅ 저장 완료: {DATA_FILE}")
        print(f"📊 총 레코드: {len(sorted_history)}개")

    except Exception as e:
        print(f"❌ 저장 실패: {e}", file=sys.stderr)
        return False

    return True


def main():
    """메인 실행 함수"""

    print("🚀 업비트 거래대금 수집 시작")
    print(f"⏰ 실행 시각: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    # 1. 현재 거래대금 조회
    total_volume = get_upbit_total_volume()

    if total_volume is None:
        print("❌ 거래대금 조회 실패")
        sys.exit(1)

    # 2. 기존 히스토리 로드
    history = load_history()

    # 3. 오늘 날짜로 데이터 추가/업데이트
    today = get_kst_date()

    if today in history:
        print(f"⚠️ {today} 데이터가 이미 존재합니다. 업데이트합니다.")

    history[today] = total_volume

    # 4. 저장
    if save_history(history):
        print(f"\n✅ 완료! {today} = {total_volume:,.0f}원")

        # 최근 7일 요약
        recent_dates = sorted(history.keys())[-7:]
        print(f"\n📈 최근 7일 거래대금:")
        for date in recent_dates:
            volume_trillion = history[date] / 1_000_000_000_000
            print(f"  {date}: {volume_trillion:>6.2f}조원")
    else:
        print("\n❌ 저장 실패")
        sys.exit(1)


if __name__ == "__main__":
    main()
