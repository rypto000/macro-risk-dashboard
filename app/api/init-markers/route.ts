import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

interface ChartMarker {
  id: string;
  date: string;
  label: string;
  color: string;
  description?: string;
}

const redis = Redis.fromEnv();
const REDIS_KEY = 'chart-markers';

// 초기 마커 데이터
const initialMarkers: ChartMarker[] = [
  {
    id: '1',
    date: '2021-05-01',
    label: '21년 불장',
    color: '#fbbf24',
    description: '2021년 암호화폐 불장 정점'
  },
  {
    id: '2',
    date: '2025-01-01',
    label: '25년 불장',
    color: '#fbbf24',
    description: '2025년 암호화폐 불장 시작'
  }
];

/**
 * 초기 마커 데이터를 Redis에 로드
 * POST /api/init-markers
 */
export async function POST() {
  try {
    // 기존 데이터 확인
    const existing = await redis.get<ChartMarker[]>(REDIS_KEY);

    if (existing && existing.length > 0) {
      return NextResponse.json({
        success: false,
        message: '이미 마커 데이터가 존재합니다.',
        count: existing.length
      });
    }

    // 초기 데이터 저장
    await redis.set(REDIS_KEY, initialMarkers);

    return NextResponse.json({
      success: true,
      message: '초기 마커 데이터가 로드되었습니다.',
      markers: initialMarkers
    });

  } catch (error: any) {
    console.error('초기화 실패:', error);
    return NextResponse.json(
      { success: false, error: '초기화 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 현재 Redis 데이터 확인
 * GET /api/init-markers
 */
export async function GET() {
  try {
    const markers = await redis.get<ChartMarker[]>(REDIS_KEY);

    return NextResponse.json({
      success: true,
      exists: !!markers,
      count: markers?.length || 0,
      markers: markers || []
    });

  } catch (error: any) {
    console.error('조회 실패:', error);
    return NextResponse.json(
      { success: false, error: '조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
