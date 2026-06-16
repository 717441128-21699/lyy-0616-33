import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid3x3, AlertTriangle, Filter } from 'lucide-react';
import type { HeatmapData } from '@/types';
import { fetchHeatmap } from '@/api';
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

function riskBadge(risk: string | null): { text: string; className: string } {
  if (risk === 'critical') return { text: '高危', className: 'bg-red-100 text-red-700' };
  if (risk === 'at_risk') return { text: '有风险', className: 'bg-orange-100 text-orange-700' };
  if (risk === 'healthy') return { text: '正常', className: 'bg-green-100 text-green-700' };
  return { text: '无依赖', className: 'bg-gray-100 text-gray-500' };
}

interface CellData {
  progress: number | null;
  okrTitle: string;
  okrLevel: string;
  okrId: string;
  riskStatus: string | null;
}

export default function Heatmap() {
  const navigate = useNavigate();
  const [data, setData] = useState<HeatmapData | null>(null);
  const [filters, setFilters] = useState({
    department: '',
    level: '',
    risk: '',
    quarter: '',
    year: '',
  });

  useEffect(() => {
    const params: Record<string, string> = {};
    if (filters.department) params.department_id = filters.department;
    if (filters.level) params.level = filters.level;
    if (filters.risk) params.risk_status = filters.risk;
    if (filters.quarter) params.quarter = filters.quarter;
    if (filters.year) params.year = filters.year;
    fetchHeatmap(params).then(setData);
  }, [filters]);

  const departments = useMemo(() => {
    if (!data) return [];
    const deptMap = new Map<string, string>();
    data.members.forEach((m) => {
      if (m.department_id && m.department_name) {
        deptMap.set(m.department_id, m.department_name);
      }
    });
    return Array.from(deptMap.entries()).map(([id, name]) => ({ id, name }));
  }, [data]);

  const quarters = useMemo(() => {
    if (!data) return [];
    const qs = new Set<string>();
    data.okrs.forEach((o) => qs.add(`${o.year}${o.quarter}`));
    return Array.from(qs).sort();
  }, [data]);

  const filteredMembers = data?.members || [];
  const okrColumns = data?.okrs || [];

  const getCellData = (userId: string, okrId: string): CellData => {
    const okr = okrColumns.find((o) => o.okr_id === okrId);
    if (!okr || okr.owner_id !== userId) return { progress: null, okrTitle: '', okrLevel: '', okrId: '', riskStatus: null };
    return { progress: okr.progress, okrTitle: okr.title, okrLevel: okr.level, okrId: okr.okr_id, riskStatus: okr.risk_status };
  };

  const laggards = useMemo(() => {
    if (!data) return [];
    return data.okrs
      .filter((o) => o.progress < 40)
      .map((o) => ({
        id: o.okr_id,
        title: o.title,
        progress: o.progress,
        level: o.level,
        risk_status: o.risk_status,
        owner_name: data.members.find((m) => m.user_id === o.owner_id)?.user_name || '',
      }));
  }, [data]);

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2">
          <Grid3x3 className="w-6 h-6 text-brand-600" />
          进度热力图
        </h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">筛选条件</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <select
            value={filters.department}
            onChange={(e) => updateFilter('department', e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
          >
            <option value="">全部部门</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select
            value={filters.level}
            onChange={(e) => updateFilter('level', e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
          >
            <option value="">全部层级</option>
            <option value="company">公司级</option>
            <option value="department">部门级</option>
            <option value="individual">个人级</option>
          </select>
          <select
            value={filters.risk}
            onChange={(e) => updateFilter('risk', e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
          >
            <option value="">全部风险</option>
            <option value="healthy">正常</option>
            <option value="at_risk">有风险</option>
            <option value="critical">高危</option>
            <option value="none">无依赖</option>
          </select>
          <select
            value={filters.quarter}
            onChange={(e) => updateFilter('quarter', e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
          >
            <option value="">全部季度</option>
            <option value="Q1">Q1</option>
            <option value="Q2">Q2</option>
            <option value="Q3">Q3</option>
            <option value="Q4">Q4</option>
          </select>
          <select
            value={filters.year}
            onChange={(e) => updateFilter('year', e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
          >
            <option value="">全部年份</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600 sticky left-0 bg-gray-50 z-10 min-w-[180px]">成员</th>
                {okrColumns.map((okr) => (
                  <th key={okr.okr_id} className="px-3 py-3 font-medium text-gray-600 min-w-[140px] text-center" title={okr.title}>
                    <span className="block truncate max-w-[130px]">{okr.title}</span>
                    {okr.risk_status && (
                      <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${riskBadge(okr.risk_status).className}`}>
                        {riskBadge(okr.risk_status).text}
                      </span>
                    )}
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
                            <button
                              onClick={() => navigate(`/okrs/${cell.okrId}?from=heatmap&progress=${cell.progress}&risk=${cell.riskStatus || ''}&member=${member.user_id}`)}
                              className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold ${cellColor(cell.progress)} hover:ring-2 hover:ring-brand-300 transition-all cursor-pointer`}
                            >
                              {Math.round(cell.progress)}%
                            </button>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                              <p className="font-medium">{cell.okrTitle}</p>
                              <p className="text-gray-300 mt-0.5">进度: {Math.round(cell.progress)}% | {levelLabel(cell.okrLevel)}</p>
                              {cell.riskStatus && (
                                <p className="text-gray-300 mt-0.5">风险: {riskBadge(cell.riskStatus).text}</p>
                              )}
                              <p className="text-brand-300 mt-1 text-[10px]">点击查看详情 →</p>
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
          <span className="text-sm font-normal text-gray-400">（进度低于40%）</span>
        </h3>
        {laggards.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">暂无落后项</p>
        ) : (
          <div className="space-y-3">
            {laggards.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/okrs/${item.id}?from=heatmap&progress=${item.progress}&risk=${item.risk_status || ''}&laggard=true`)}
                className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-brand-300 hover:shadow-sm cursor-pointer transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{item.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.owner_name}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${levelBadge(item.level)}`}>{levelLabel(item.level)}</span>
                {item.risk_status && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${riskBadge(item.risk_status).className}`}>
                    {riskBadge(item.risk_status).text}
                  </span>
                )}
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
