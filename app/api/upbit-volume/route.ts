import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * 업비트 거래대금 히스토리 API
 *
 * GET /api/upbit-volume
 * 저장된 일일 거래대금 데이터를 반환합니다.
 *
 * 이동평균 기준:
 * - MA7: 7일 이동평균
 * - MA30: 30일 이동평균
 * - MA90: 90일 이동평균
 *
 * 과열/냉각 판단 기준:
 * - 과열: 90일 평균 대비 200% 이상
 * - 냉각: 90일 평균 대비 50% 이하
 * - 정상: 그 외
 */
export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'upbit_volume_history.json');

    // JSON 파일 읽기
    const fileContent = await fs.readFile(dataPath, 'utf-8');
    const data = JSON.parse(fileContent);

    // 날짜 기준으로 정렬된 배열로 변환
    const sortedData = Object.entries(data)
      .map(([date, volume]) => ({
        date,
        volume: Number(volume),
        volumeTrillion: Number(volume) / 1_000_000_000_000, // 조 단위 변환
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 이동평균 계산
    const dataWithMA = sortedData.map((item, index) => {
      // 7일 이동평균
      const ma7Start = Math.max(0, index - 6);
      const ma7Data = sortedData.slice(ma7Start, index + 1);
      const ma7 = ma7Data.reduce((sum, d) => sum + d.volume, 0) / ma7Data.length;

      // 30일 이동평균
      const ma30Start = Math.max(0, index - 29);
      const ma30Data = sortedData.slice(ma30Start, index + 1);
      const ma30 = ma30Data.reduce((sum, d) => sum + d.volume, 0) / ma30Data.length;

      // 90일 이동평균
      const ma90Start = Math.max(0, index - 89);
      const ma90Data = sortedData.slice(ma90Start, index + 1);
      const ma90 = ma90Data.reduce((sum, d) => sum + d.volume, 0) / ma90Data.length;

      return {
        ...item,
        ma7: ma7 / 1_000_000_000_000,
        ma30: ma30 / 1_000_000_000_000,
        ma90: ma90 / 1_000_000_000_000,
      };
    });

    // 최근 데이터 (현재 상태 분석용)
    const latest = dataWithMA[dataWithMA.length - 1];

    // 과열/냉각 판단
    let status = 'normal';
    if (latest && latest.ma90 > 0) {
      const ratio = latest.volume / (latest.ma90 * 1_000_000_000_000);
      if (ratio >= 2.0) {
        status = 'overheated'; // 과열 (200% 이상)
      } else if (ratio <= 0.5) {
        status = 'cold'; // 냉각 (50% 이하)
      }
    }

    // 백분위수 계산
    const allVolumes = sortedData.map(d => d.volume);
    const sortedVolumes = [...allVolumes].sort((a, b) => a - b);

    // 통계 계산
    const calculatePercentile = (arr: number[], value: number): number => {
      const count = arr.filter(v => v <= value).length;
      return (count / arr.length) * 100;
    };

    const calculateValueAtPercentile = (arr: number[], percentile: number): number => {
      const index = Math.floor((percentile / 100) * arr.length);
      return arr[index] / 1_000_000_000_000; // 조 단위
    };

    const currentPercentile = latest ? calculatePercentile(allVolumes, latest.volume) : 0;
    const average = allVolumes.reduce((sum, v) => sum + v, 0) / allVolumes.length;
    const median = sortedVolumes[Math.floor(sortedVolumes.length / 2)];
    const min = sortedVolumes[0];
    const max = sortedVolumes[sortedVolumes.length - 1];

    // 백분위수 기준값들
    const percentiles = {
      p10: calculateValueAtPercentile(sortedVolumes, 10),
      p25: calculateValueAtPercentile(sortedVolumes, 25),
      p50: calculateValueAtPercentile(sortedVolumes, 50),
      p75: calculateValueAtPercentile(sortedVolumes, 75),
      p90: calculateValueAtPercentile(sortedVolumes, 90),
      p95: calculateValueAtPercentile(sortedVolumes, 95),
    };

    return NextResponse.json({
      success: true,
      data: dataWithMA,
      latest: {
        date: latest?.date,
        volume: latest?.volume,
        volumeTrillion: latest?.volumeTrillion,
        ma7: latest?.ma7,
        ma30: latest?.ma30,
        ma90: latest?.ma90,
        status,
        percentile: currentPercentile,
      },
      statistics: {
        average: average / 1_000_000_000_000,
        median: median / 1_000_000_000_000,
        min: min / 1_000_000_000_000,
        max: max / 1_000_000_000_000,
        percentiles,
      },
      metadata: {
        totalRecords: dataWithMA.length,
        firstDate: dataWithMA[0]?.date,
        lastDate: latest?.date,
      },
    });

  } catch (error: any) {
    console.error('업비트 거래대금 API 오류:', error);

    // 파일이 없는 경우
    if (error.code === 'ENOENT') {
      return NextResponse.json(
        {
          success: false,
          error: '데이터 파일을 찾을 수 없습니다. 데이터 수집을 먼저 실행하세요.',
          data: [],
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: '데이터를 불러오는 중 오류가 발생했습니다.',
        data: [],
      },
      { status: 500 }
    );
  }
}
