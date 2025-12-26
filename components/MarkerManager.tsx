'use client';

import { useState, useEffect } from 'react';

interface ChartMarker {
  id: string;
  date: string;
  label: string;
  color: string;
  description?: string;
}

interface MarkerManagerProps {
  onMarkersChange?: () => void;
}

export default function MarkerManager({ onMarkersChange }: MarkerManagerProps) {
  const [markers, setMarkers] = useState<ChartMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // 전체 섹션 접기/펼치기

  // 새 마커 입력 상태
  const [newDate, setNewDate] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('#fbbf24');
  const [newDescription, setNewDescription] = useState('');

  // 마커 목록 로드
  const loadMarkers = async () => {
    try {
      const res = await fetch('/api/chart-markers');
      const data = await res.json();
      if (data.success) {
        setMarkers(data.markers || []);
      }
    } catch (error) {
      console.error('마커 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarkers();
  }, []);

  // 마커 추가
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newDate || !newLabel) {
      alert('날짜와 라벨을 입력하세요.');
      return;
    }

    try {
      const res = await fetch('/api/chart-markers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: newDate,
          label: newLabel,
          color: newColor,
          description: newDescription
        })
      });

      const data = await res.json();

      if (data.success) {
        setNewDate('');
        setNewLabel('');
        setNewColor('#fbbf24');
        setNewDescription('');
        setIsFormOpen(false);
        await loadMarkers();
        onMarkersChange?.();
      } else {
        alert(`추가 실패: ${data.error}`);
      }
    } catch (error) {
      console.error('마커 추가 실패:', error);
      alert('마커 추가 중 오류가 발생했습니다.');
    }
  };

  // 마커 삭제
  const handleDelete = async (id: string) => {
    if (!confirm('이 마커를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const res = await fetch(`/api/chart-markers?id=${id}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (data.success) {
        await loadMarkers();
        onMarkersChange?.();
      } else {
        alert(`삭제 실패: ${data.error}`);
      }
    } catch (error) {
      console.error('마커 삭제 실패:', error);
      alert('마커 삭제 중 오류가 발생했습니다.');
    }
  };

  const colorOptions = [
    { value: '#fbbf24', label: '노랑', emoji: '🟡' },
    { value: '#ef4444', label: '빨강', emoji: '🔴' },
    { value: '#3b82f6', label: '파랑', emoji: '🔵' },
    { value: '#10b981', label: '초록', emoji: '🟢' },
    { value: '#a855f7', label: '보라', emoji: '🟣' }
  ];

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 shadow-lg">
        <p className="text-slate-400">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg">
      {/* 헤더 - 항상 보임 */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-700/50 transition-colors rounded-lg"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{isExpanded ? '▼' : '▶'}</span>
          <h3 className="text-lg font-bold text-white">📌 차트 이벤트 마커 관리</h3>
          <span className="text-sm text-slate-400">({markers.length}개)</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsFormOpen(!isFormOpen);
            if (!isExpanded) setIsExpanded(true);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
        >
          {isFormOpen ? '✕ 닫기' : '+ 마커 추가'}
        </button>
      </div>

      {/* 접을 수 있는 콘텐츠 */}
      {isExpanded && (
        <div className="px-6 pb-6">

      {/* 추가 폼 */}
      {isFormOpen && (
        <form onSubmit={handleAdd} className="mb-6 p-4 bg-slate-700/50 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                날짜 *
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-600 text-white rounded border border-slate-500 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                라벨 *
              </label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="예: 21년 불장"
                className="w-full px-3 py-2 bg-slate-600 text-white rounded border border-slate-500 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              색상
            </label>
            <div className="flex gap-3">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setNewColor(option.value)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    newColor === option.value
                      ? 'bg-slate-600 ring-2 ring-white'
                      : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  <span className="text-xl">{option.emoji}</span>
                  <span className="ml-2 text-sm text-slate-300">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              설명 (선택)
            </label>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="예: 2021년 암호화폐 불장 정점"
              className="w-full px-3 py-2 bg-slate-600 text-white rounded border border-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
          >
            ✓ 추가하기
          </button>
        </form>
      )}

      {/* 마커 목록 */}
      <div className="space-y-2">
        <p className="text-sm text-slate-400 mb-3">
          총 {markers.length}개의 마커
        </p>

        {markers.length === 0 ? (
          <p className="text-slate-500 text-center py-8">
            등록된 마커가 없습니다. 위 버튼을 눌러 추가하세요.
          </p>
        ) : (
          markers.map((marker) => (
            <div
              key={marker.id}
              className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: marker.color }}
                ></div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{marker.label}</span>
                    <span className="text-slate-400 text-sm">({marker.date})</span>
                  </div>
                  {marker.description && (
                    <p className="text-xs text-slate-500 mt-1">{marker.description}</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleDelete(marker.id)}
                className="px-3 py-1 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
              >
                ✕ 삭제
              </button>
            </div>
          ))
        )}
        </div>
      )}
    </div>
  );
}
