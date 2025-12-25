#!/usr/bin/env python3
"""
업비트 거래대금 히스토리 백필 스크립트

과거 1-2년치 일일 거래대금 데이터를 수집합니다.

Usage:
    python3 scripts/backfill_upbit_history.py --days 365
"""

import os
import sys
import json
import requests
import time
import argparse
from datetime import datetime, timedelta, timezone
from pathlib import Path
from collections import defaultdict

# 프로젝트 루트
PROJECT_ROOT = Path(__file__).parent.parent
DATA_FILE = PROJECT_ROOT / "data" / "upbit_volume_history.json"

# KST 타임존 (UTC+9)
KST = timezone(timedelta(hours=9))


def get_kst_date(date_obj):
    """datetime 객체를 KST 날짜 문자열로 변환"""
    return date_obj.astimezone(KST).strftime("%Y-%m-%d")


def get_krw_markets():
    """전체 KRW 마켓 리스트 조회"""
    print("📊 KRW 마켓 리스트 조회 중...")
    response = requests.get('https://api.upbit.com/v1/market/all', timeout=10)
    response.raise_for_status()
    markets = response.json()
    krw_markets = [m['market'] for m in markets if m['market'].startswith('KRW-')]
    print(f"✅ KRW 마켓: {len(krw_markets)}개")
    return krw_markets


def get_daily_candles(market, days=200, to_date=None):
    """특정 마켓의 일봉 데이터 조회

    Args:
        market: 마켓 코드 (예: KRW-BTC)
        days: 조회할 일수 (최대 200)
        to_date: 종료 날짜 (YYYY-MM-DD HH:mm:ss), None이면 현재

    Returns:
        list: 일봉 데이터 리스트
    """
    url = "https://api.upbit.com/v1/candles/days"
    params = {
        "market": market,
        "count": min(days, 200)
    }

    if to_date:
        params["to"] = to_date

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"  ⚠️ {market} 조회 실패: {e}")
        return []


def collect_historical_data(days=365):
    """과거 N일치 거래대금 데이터 수집

    Args:
        days: 수집할 과거 일수
    """
    print(f"\n🚀 과거 {days}일치 데이터 수집 시작\n")

    # 1. KRW 마켓 리스트
    krw_markets = get_krw_markets()

    # 2. 날짜별 거래대금 저장용
    daily_volumes = defaultdict(int)

    # 3. 수집할 기간 계산
    # 200개씩 나눠서 조회
    num_batches = (days + 199) // 200

    print(f"\n📅 수집 계획:")
    print(f"  - 기간: 최근 {days}일")
    print(f"  - 배치: {num_batches}번")
    print(f"  - 마켓: {len(krw_markets)}개")
    print(f"  - 총 요청: 약 {num_batches * len(krw_markets)}회")
    print(f"  - 예상 시간: 약 {num_batches * len(krw_markets) * 0.12 / 60:.1f}분\n")

    # 4. 배치별로 수집
    for batch_idx in range(num_batches):
        batch_days = min(200, days - batch_idx * 200)

        # 이 배치의 종료 날짜 계산
        if batch_idx == 0:
            to_date = None  # 가장 최근 = 현재
        else:
            # 이전 배치의 시작일 = 이 배치의 종료일
            days_ago = batch_idx * 200
            to_datetime = datetime.now(KST) - timedelta(days=days_ago)
            to_date = to_datetime.strftime("%Y-%m-%d %H:%M:%S")

        print(f"📦 배치 {batch_idx + 1}/{num_batches} (최근 {batch_days}일)")
        if to_date:
            print(f"   종료일: {to_date}")

        # 각 마켓별로 일봉 데이터 수집
        for market_idx, market in enumerate(krw_markets):
            candles = get_daily_candles(market, batch_days, to_date)

            # 날짜별로 거래대금 누적
            for candle in candles:
                date_kst = candle['candle_date_time_kst'][:10]  # YYYY-MM-DD
                trade_price = candle.get('candle_acc_trade_price', 0)
                daily_volumes[date_kst] += trade_price

            # Rate limit 준수 (초당 10회 = 0.1초 간격)
            time.sleep(0.12)

            # 진행 상황 표시
            if (market_idx + 1) % 50 == 0:
                print(f"   진행: {market_idx + 1}/{len(krw_markets)} 마켓 완료")

        print(f"   ✅ 배치 {batch_idx + 1} 완료\n")

    # 5. 기존 데이터 로드
    existing_data = {}
    if DATA_FILE.exists():
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            existing_data = json.load(f)

    # 6. 새 데이터와 병합 (기존 데이터 우선)
    for date, volume in daily_volumes.items():
        if date not in existing_data:
            existing_data[date] = int(volume)

    # 7. 날짜 순 정렬
    sorted_data = dict(sorted(existing_data.items()))

    # 8. 저장
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(sorted_data, f, indent=2, ensure_ascii=False)

    print(f"✅ 저장 완료: {DATA_FILE}")
    print(f"📊 총 레코드: {len(sorted_data)}개")
    print(f"📅 기간: {min(sorted_data.keys())} ~ {max(sorted_data.keys())}")

    # 최근 7일 확인
    recent_dates = sorted(sorted_data.keys())[-7:]
    print(f"\n📈 최근 7일 거래대금:")
    for date in recent_dates:
        volume_trillion = sorted_data[date] / 1_000_000_000_000
        print(f"  {date}: {volume_trillion:>6.2f}조원")


def main():
    parser = argparse.ArgumentParser(description='업비트 거래대금 히스토리 백필')
    parser.add_argument('--days', type=int, default=365,
                       help='수집할 과거 일수 (기본: 365일)')
    args = parser.parse_args()

    try:
        collect_historical_data(args.days)
        print("\n✅ 백필 완료!")
    except KeyboardInterrupt:
        print("\n\n⚠️ 사용자가 중단했습니다.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
