'use client';

import { useState } from 'react';

interface DataPoint {
  date: string;
  value: number | null;
}

interface DataTableProps {
  t10y2y: DataPoint[];
  unrate: DataPoint[];
  ismPmi: DataPoint[];
  hyOas: DataPoint[];
}

export default function DataTable({
  t10y2y,
  unrate,
  ismPmi,
  hyOas
}: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;

  // Combine all data by date
  const dateMap = new Map<string, any>();

  t10y2y.forEach(d => {
    if (!dateMap.has(d.date)) dateMap.set(d.date, { date: d.date });
    dateMap.get(d.date)!.t10y2y = d.value;
  });

  unrate.forEach(d => {
    if (!dateMap.has(d.date)) dateMap.set(d.date, { date: d.date });
    dateMap.get(d.date)!.unrate = d.value;
  });

  ismPmi.forEach(d => {
    if (!dateMap.has(d.date)) dateMap.set(d.date, { date: d.date });
    dateMap.get(d.date)!.ismPmi = d.value;
  });

  hyOas.forEach(d => {
    if (!dateMap.has(d.date)) dateMap.set(d.date, { date: d.date });
    dateMap.get(d.date)!.hyOas = d.value;
  });

  const allData = Array.from(dateMap.values())
    .sort((a, b) => b.date.localeCompare(a.date)); // Sort descending (newest first)

  const totalPages = Math.ceil(allData.length / rowsPerPage);
  const startIdx = (currentPage - 1) * rowsPerPage;
  const endIdx = startIdx + rowsPerPage;
  const currentData = allData.slice(startIdx, endIdx);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit' });
  };

  const formatValue = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    return value.toFixed(2);
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
      <h2 className="text-2xl font-bold mb-4 text-white">📋 전체 데이터 테이블</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-slate-700 text-gray-300">
            <tr>
              <th className="px-6 py-3">날짜 (YYYY-MM)</th>
              <th className="px-6 py-3">T10Y2Y (%)</th>
              <th className="px-6 py-3">UNRATE (%)</th>
              <th className="px-6 py-3">ISM PMI</th>
              <th className="px-6 py-3">HY OAS (%)</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((row, index) => (
              <tr
                key={row.date}
                className={`border-b border-slate-700 ${
                  index % 2 === 0 ? 'bg-slate-800' : 'bg-slate-750'
                } hover:bg-slate-700`}
              >
                <td className="px-6 py-3 font-medium text-white">
                  {formatDate(row.date)}
                </td>
                <td className="px-6 py-3 text-gray-300">
                  {formatValue(row.t10y2y)}
                </td>
                <td className="px-6 py-3 text-gray-300">
                  {formatValue(row.unrate)}
                </td>
                <td className="px-6 py-3 text-gray-300">
                  {formatValue(row.ismPmi)}
                </td>
                <td className="px-6 py-3 text-gray-300">
                  {formatValue(row.hyOas)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-400">
          {startIdx + 1}-{Math.min(endIdx, allData.length)} / 전체 {allData.length}개
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-slate-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600"
          >
            이전
          </button>
          <span className="px-4 py-2 text-white">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-slate-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600"
          >
            다음
          </button>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        * 최신 데이터부터 표시됩니다
        <br />
        * 빈 값(-)은 해당 날짜에 데이터가 없음을 의미합니다
      </p>
    </div>
  );
}
