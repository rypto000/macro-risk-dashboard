'use client';

interface IndicatorSummary {
  name: string;
  value: number | null;
  threshold: number;
  status: 'OK' | 'WARN';
  description: string;
}

interface SummaryTableProps {
  indicators: IndicatorSummary[];
}

export default function SummaryTable({ indicators }: SummaryTableProps) {
  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
      <h2 className="text-2xl font-bold mb-4 text-white">📊 지표 요약</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-600">
              <th className="py-3 px-4 font-bold text-gray-200">지표</th>
              <th className="py-3 px-4 font-bold text-gray-200">현재값</th>
              <th className="py-3 px-4 font-bold text-gray-200">기준선</th>
              <th className="py-3 px-4 font-bold text-gray-200">상태</th>
            </tr>
          </thead>
          <tbody>
            {indicators.map((indicator) => (
              <tr key={indicator.name} className="border-b border-slate-700 hover:bg-slate-700/50">
                <td className="py-3 px-4 font-medium text-gray-300">{indicator.name}</td>
                <td className="py-3 px-4 text-gray-300">
                  {indicator.value !== null ? indicator.value.toFixed(2) : 'N/A'}
                </td>
                <td className="py-3 px-4 text-gray-300">{indicator.threshold}</td>
                <td className="py-3 px-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      indicator.status === 'OK'
                        ? 'bg-green-900/50 text-green-300 border border-green-700'
                        : 'bg-yellow-900/50 text-yellow-300 border border-yellow-700'
                    }`}
                  >
                    {indicator.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
