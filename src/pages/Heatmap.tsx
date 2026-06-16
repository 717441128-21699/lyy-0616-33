import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid3x3, AlertTriangle, Filter, TrendingUp, FileText, Zap, Activity, ChevronDown } from 'lucide-react';
import type { HeatmapData } from '@/types';
import { fetchHeatmap, fetchTrends, type OkrTrend, type TrendPoint } from '@/api';
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

function MiniSparkline({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) return <span className="text-xs text-gray-400">数据不足</span>;
  const values = points.map(p => p.progress);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 120;
  const h = 32;
  const coords = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });
  const pathD = `M${coords.join(' L')}`;
  const dipIdx = values.indexOf(min);
  const dipX = (dipIdx / (values.length - 1)) * w;
  const dipY = h - ((min - min) / range) * (h - 4) - 2;

  return (
    <svg width={w} height={h} className="inline-block">
      <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2" />
      <circle cx={dipX} cy={dipY} r="4" fill="#ef4444" stroke="white" strokeWidth="1.5" />
    </svg>
  );
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
  const [view, setView] = useState<'heatmap' | 'trend'>('heatmap');
  const [data, setData] = useState<HeatmapData | null>(null);
  const [trendData, setTrendData] = useState<OkrTrend[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [filters, setFilters] = useState({
    department: '',
    level: '',
    risk: '',
    quarter: 'Q2',
    year: '2026',
  });
  const [expandedTrend, setExpandedTrend] = useState<string | null>(null);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (filters.department) params.department_id = filters.department;
    if (filters.level) params.level = filters.level;
    if (filters.risk) params.risk_status = filters.risk;
    if (filters.quarter) params.quarter = filters.quarter;
    if (filters.year) params.year = filters.year;
    fetchHeatmap(params).then(setData);
  }, [filters]);

  useEffect(() => {
    if (view !== 'trend' || !filters.quarter || !filters.year) return;
    setTrendLoading(true);
    const params: Record<string, string> = { quarter: filters.quarter, year: filters.year };
    if (filters.department) params.department_id = filters.department;
    fetchTrends(params).then(d => { setTrendData(d); setTrendLoading(false); }).catch(() => setTrendLoading(false));
  }, [view, filters.quarter, filters.year, filters.department]);

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

  const handleDipClick = (okrId: string, point: TrendPoint) => {
    if (point.type === 'weekly_update') {
      navigate(`/okrs/${okrId}?from=trend&highlight=weekly&pointId=${point.id}`);
    } else {
      navigate(`/okrs/${okrId}?from=trend&highlight=activity&pointId=${point.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2">
          <Grid3x3 className="w-6 h-6 text-brand-600" />
          进度热力图
        </h2>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView('heatmap')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'heatmap' ? 'bg-white shadow-sm text-brand-700' : 'text-gray-600 hover:text-gray-800'}`}
          >
            <Grid3x3 className="w-4 h-4 inline mr-1" />热力图
          </button>
          <button
            onClick={() => setView('trend')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'trend' ? 'bg-white shadow-sm text-brand-700' : 'text-gray-600 hover:text-gray-800'}`}
          >
            <TrendingUp className="w-4 h-4 inline mr-1" />趋势
          </button>
        </div>
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
          {view === 'heatmap' && (
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
          )}
          {view === 'heatmap' && (
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
          )}
          <select
            value={filters.quarter}
            onChange={(e) => updateFilter('quarter', e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
          >
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
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>
      </div>

      {view === 'heatmap' ? (
        <>
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
        </>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-display font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-brand-600" />
            OKR进度趋势
            <span className="text-sm font-normal text-gray-400">{filters.quarter} {filters.year}</span>
          </h3>

          {trendLoading ? (
            <div className="py-16 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-sm text-gray-500">加载趋势数据...</p>
            </div>
          ) : trendData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-12">该季度暂无OKR数据</p>
          ) : (
            <div className="space-y-3">
              {trendData.map((trend) => {
                const isExpanded = expandedTrend === trend.okr_id;
                const hasDip = trend.lowest_dip !== null;
                return (
                  <div key={trend.okr_id} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div
                      onClick={() => setExpandedTrend(isExpanded ? null : trend.okr_id)}
                      className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${levelBadge(trend.level)}`}>{levelLabel(trend.level)}</span>
                          <p className="text-sm font-medium text-gray-800 truncate">{trend.title}</p>
                          {trend.risk_status && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${riskBadge(trend.risk_status).className}`}>
                              {riskBadge(trend.risk_status).text}
                            </span>
                          )}
                          {hasDip && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-medium flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3" />有低谷
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs text-gray-500">{trend.owner_name}</span>
                          <span className="text-xs text-gray-400">{trend.weekly_count}条周报</span>
                          <span className="text-xs text-gray-400">{trend.log_count}条变更</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <MiniSparkline points={trend.progress_points} />
                        <span className="text-sm font-bold text-gray-700 w-12 text-right">{trend.current_progress.toFixed(1)}%</span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                        <div className="space-y-2">
                          {trend.points.map((point, idx) => (
                            <div
                              key={idx}
                              onClick={() => handleDipClick(trend.okr_id, point)}
                              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-white transition-colors ${
                                trend.lowest_dip && point.id === trend.lowest_dip.id
                                  ? 'bg-red-50 border border-red-200'
                                  : 'bg-white border border-gray-100'
                              }`}
                            >
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                                point.type === 'kr_update' ? 'bg-blue-100' :
                                point.type === 'kr_sync' ? 'bg-accent-100' :
                                point.type === 'weekly_update' ? 'bg-brand-100' :
                                'bg-orange-100'
                              }`}>
                                {point.type === 'kr_update' || point.type === 'kr_sync' ? (
                                  <Activity className={`w-3.5 h-3.5 ${point.type === 'kr_update' ? 'text-blue-600' : 'text-accent-600'}`} />
                                ) : point.type === 'weekly_update' ? (
                                  <FileText className="w-3.5 h-3.5 text-brand-600" />
                                ) : (
                                  <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                    point.type === 'kr_update' ? 'bg-blue-50 text-blue-700' :
                                    point.type === 'kr_sync' ? 'bg-accent-50 text-accent-700' :
                                    point.type === 'weekly_update' ? 'bg-brand-50 text-brand-700' :
                                    'bg-orange-50 text-orange-700'
                                  }`}>
                                    {point.type === 'kr_update' ? 'KR更新' :
                                     point.type === 'kr_sync' ? '自动同步' :
                                     point.type === 'weekly_update' ? '周报' : '风险变更'}
                                  </span>
                                  {point.progress >= 0 && (
                                    <span className="text-xs font-bold text-gray-700">{point.progress.toFixed(1)}%</span>
                                  )}
                                  {trend.lowest_dip && point.id === trend.lowest_dip.id && (
                                    <span className="text-[10px] text-red-600 font-bold">⬇ 低谷</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 mt-0.5 truncate">{point.description}</p>
                              </div>
                              <span className="text-xs text-gray-400 flex-shrink-0">
                                {new Date(point.date).toLocaleDateString('zh-CN')}
                              </span>
                            </div>
                          ))}
                          {trend.points.length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-4">暂无变更记录</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
