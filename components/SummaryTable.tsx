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
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">📊 지표 요약</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="py-3 px-4 font-bold">지표</th>
              <th className="py-3 px-4 font-bold">현재값</th>
              <th className="py-3 px-4 font-bold">기준선</th>
              <th className="py-3 px-4 font-bold">상태</th>
            </tr>
          </thead>
          <tbody>
            {indicators.map((indicator) => (
              <tr key={indicator.name} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{indicator.name}</td>
                <td className="py-3 px-4">
                  {indicator.value !== null ? indicator.value.toFixed(2) : 'N/A'}
                </td>
                <td className="py-3 px-4">{indicator.threshold}</td>
                <td className="py-3 px-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      indicator.status === 'OK'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
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
