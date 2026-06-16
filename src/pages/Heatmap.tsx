import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid3x3, AlertTriangle } from 'lucide-react';
import type { HeatmapData } from '@/types';
import { fetchHeatmap, fetchOkrs } from '@/api';
import ProgressBar from '@/components/ProgressBar';

function cellColor(progress: number | null): string {
  if (progress === null) return 'bg-gray-100 text-gray-400';
  if (progress > 66) return 'bg-green-100 text-green-700';
  if (progress >= 33) return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-700';
}

function levelBadge(level: string): string {
  if (level === 'company') return 'bg-brand-100 text-brand-700';
  if (level === 'department') return 'bg-purple-100 text-purple-700';
  return 'bg-gray-100 text-gray-700';
}

function levelLabel(level: string): string {
  if (level === 'company') return '公司';
  if (level === 'department') return '部门';
  return '个人';
}

interface CellData {
  progress: number | null;
  okrTitle: string;
  okrLevel: string;
}

export default function Heatmap() {
  const navigate = useNavigate();
  const [data, setData] = useState<HeatmapData | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [laggards, setLaggards] = useState<{ id: string; title: string; owner_name: string; progress: number; level: string }[]>([]);

  useEffect(() => {
    fetchHeatmap().then(setData);
    fetchOkrs().then((okrs) => {
      setLaggards(okrs.filter((o) => o.overall_progress < 40).map((o) => ({ id: o.id, title: o.title, owner_name: o.owner_name || '', progress: o.overall_progress, level: o.level })));
    });
  }, []);

  const departments = [...new Set(data?.members.map((m) => m.department_name).filter(Boolean))] as string[];
  const filteredMembers = data ? (departmentFilter ? data.members.filter((m) => m.department_name === departmentFilter) : data.members) : [];
  const okrColumns = data?.okrs || [];

  const getCellData = (userId: string, okrId: string): CellData => {
    const okr = okrColumns.find((o) => o.okr_id === okrId);
    if (!okr || okr.owner_id !== userId) return { progress: null, okrTitle: '', okrLevel: '' };
    return { progress: okr.progress, okrTitle: okr.title, okrLevel: okr.level };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold text-gray-900">进度热力图</h2>
        <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none">
          <option value="">全部部门</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600 sticky left-0 bg-gray-50 z-10 min-w-[180px]">成员</th>
                {okrColumns.map((okr) => (
                  <th key={okr.okr_id} className="px-3 py-3 font-medium text-gray-600 min-w-[120px] text-center" title={okr.title}>
                    <span className="block truncate max-w-[110px]">{okr.title}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr key={member.user_id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-3 sticky left-0 bg-white z-10">
                    <p className="font-medium text-gray-800">{member.user_name}</p>
                    <p className="text-xs text-gray-400">{member.department_name}</p>
                  </td>
                  {okrColumns.map((okr) => {
                    const cell = getCellData(member.user_id, okr.okr_id);
                    return (
                      <td key={okr.okr_id} className="px-3 py-3 text-center">
                        {cell.progress !== null ? (
                          <div className="group relative inline-flex items-center justify-center">
                            <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold ${cellColor(cell.progress)}`}>
                              {Math.round(cell.progress)}%
                            </span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                              <p className="font-medium">{cell.okrTitle}</p>
                              <p className="text-gray-300 mt-0.5">进度: {Math.round(cell.progress)}% | {levelLabel(cell.okrLevel)}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-block px-3 py-1.5 text-gray-300">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {filteredMembers.length === 0 && (
                <tr><td colSpan={okrColumns.length + 1} className="text-center py-12 text-gray-400">暂无数据</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-display font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-accent-500" />
          落后项列表
        </h3>
        {laggards.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">暂无落后项</p>
        ) : (
          <div className="space-y-3">
            {laggards.map((item) => (
              <div key={item.id} onClick={() => navigate(`/okrs/${item.id}`)} className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-brand-300 hover:shadow-sm cursor-pointer transition-all">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{item.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.owner_name}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${levelBadge(item.level)}`}>{levelLabel(item.level)}</span>
                <div className="w-32">
                  <ProgressBar progress={item.progress} height={6} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
