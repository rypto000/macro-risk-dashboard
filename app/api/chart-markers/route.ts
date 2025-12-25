import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export interface ChartMarker {
  id: string;
  date: string;
  label: string;
  color: string;
  description?: string;
}

const MARKERS_FILE = path.join(process.cwd(), 'data', 'chart_markers.json');

// GET: 모든 마커 조회
export async function GET() {
  try {
    const fileContent = await fs.readFile(MARKERS_FILE, 'utf-8');
    const markers: ChartMarker[] = JSON.parse(fileContent);

    return NextResponse.json({
      success: true,
      markers: markers.sort((a, b) => a.date.localeCompare(b.date))
    });
  } catch (error: any) {
    console.error('마커 조회 실패:', error);

    if (error.code === 'ENOENT') {
      // 파일이 없으면 빈 배열 반환
      return NextResponse.json({ success: true, markers: [] });
    }

    return NextResponse.json(
      { success: false, error: '마커를 불러올 수 없습니다.' },
      { status: 500 }
    );
  }
}

// POST: 새 마커 추가
export async function POST(request: Request) {
  try {
    const newMarker: Omit<ChartMarker, 'id'> = await request.json();

    // 유효성 검사
    if (!newMarker.date || !newMarker.label) {
      return NextResponse.json(
        { success: false, error: '날짜와 라벨은 필수입니다.' },
        { status: 400 }
      );
    }

    // 날짜 형식 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(newMarker.date)) {
      return NextResponse.json(
        { success: false, error: '날짜 형식은 YYYY-MM-DD 형식이어야 합니다.' },
        { status: 400 }
      );
    }

    // 기존 마커 읽기
    let markers: ChartMarker[] = [];
    try {
      const fileContent = await fs.readFile(MARKERS_FILE, 'utf-8');
      markers = JSON.parse(fileContent);
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
    }

    // 새 ID 생성
    const maxId = markers.length > 0
      ? Math.max(...markers.map(m => parseInt(m.id)))
      : 0;

    const markerWithId: ChartMarker = {
      ...newMarker,
      id: String(maxId + 1),
      color: newMarker.color || '#fbbf24'
    };

    markers.push(markerWithId);

    // 저장
    await fs.writeFile(MARKERS_FILE, JSON.stringify(markers, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      marker: markerWithId
    });

  } catch (error: any) {
    console.error('마커 추가 실패:', error);
    return NextResponse.json(
      { success: false, error: '마커를 추가할 수 없습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 마커 삭제
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 기존 마커 읽기
    const fileContent = await fs.readFile(MARKERS_FILE, 'utf-8');
    const markers: ChartMarker[] = JSON.parse(fileContent);

    // 해당 ID 마커 제거
    const filteredMarkers = markers.filter(m => m.id !== id);

    if (filteredMarkers.length === markers.length) {
      return NextResponse.json(
        { success: false, error: '해당 ID의 마커를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 저장
    await fs.writeFile(MARKERS_FILE, JSON.stringify(filteredMarkers, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: '마커가 삭제되었습니다.'
    });

  } catch (error: any) {
    console.error('마커 삭제 실패:', error);
    return NextResponse.json(
      { success: false, error: '마커를 삭제할 수 없습니다.' },
      { status: 500 }
    );
  }
}
