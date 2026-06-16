import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, Plus, Trash2, Bell, ArrowRight, ShieldAlert, CheckSquare, Filter, ChevronRight, Users, ChevronDown, Activity, FileText, Target } from 'lucide-react';
import type { OKR, Dependency, DependencyGraphData, Notification } from '@/types';
import { fetchOkrs, fetchDependencies, fetchDependencyGraph, createDependency, deleteDependency, fetchDependencyImpact, type ImpactChainData } from '@/api';
import ProgressRing from '@/components/ProgressRing';
import ProgressBar from '@/components/ProgressBar';
import Modal from '@/components/Modal';
import { useNotificationStore } from '@/store/notificationStore';

function statusBadge(status: string): string {
  if (status === 'healthy') return 'bg-green-100 text-green-700';
  if (status === 'at_risk') return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-700';
}

function statusLabel(status: string): string {
  if (status === 'healthy') return '健康';
  if (status === 'at_risk') return '有风险';
  return '高危';
}

function edgeStyle(status: string): string {
  if (status === 'healthy') return 'border-l-4 border-green-400 bg-green-50/50';
  if (status === 'at_risk') return 'border-l-4 border-orange-400 bg-orange-50/50';
  return 'border-l-4 border-red-400 bg-red-50/50';
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

export default function Dependencies() {
  const navigate = useNavigate();
  const [deps, setDeps] = useState<Dependency[]>([]);
  const [graphData, setGraphData] = useState<DependencyGraphData | null>(null);
  const [okrs, setOkrs] = useState<OKR[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [depOkrId, setDepOkrId] = useState('');
  const [dedOkrId, setDedOkrId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedDepId, setExpandedDepId] = useState<string | null>(null);
  const [impactData, setImpactData] = useState<ImpactChainData | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [selectedNotifs, setSelectedNotifs] = useState<string[]>([]);
  const [notifFilters, setNotifFilters] = useState({
    is_read: '',
    risk_level: '',
    party_type: '' as '' | 'dependent' | 'depended',
    party_okr_id: '',
  });
  const notifStore = useNotificationStore();

  const notificationOkrs = useMemo(() => {
    const okrMap = new Map<string, { id: string; title: string }>();
    notifStore.notifications.forEach((n) => {
      const enhanced = n as Notification & { dependent_okr_id?: string; depended_okr_id?: string; dependent_okr_title?: string; depended_okr_title?: string };
      if (enhanced.dependent_okr_id && enhanced.dependent_okr_title) {
        okrMap.set(enhanced.dependent_okr_id, { id: enhanced.dependent_okr_id, title: enhanced.dependent_okr_title });
      }
      if (enhanced.depended_okr_id && enhanced.depended_okr_title) {
        okrMap.set(enhanced.depended_okr_id, { id: enhanced.depended_okr_id, title: enhanced.depended_okr_title });
      }
    });
    return Array.from(okrMap.values());
  }, [notifStore.notifications]);

  const filteredNotifications = useMemo(() => {
    return notifStore.notifications.filter((n) => {
      const enhanced = n as Notification & { dependent_okr_id?: string; depended_okr_id?: string };
      if (notifFilters.party_type === 'dependent' && notifFilters.party_okr_id) {
        if (enhanced.dependent_okr_id !== notifFilters.party_okr_id) return false;
      }
      if (notifFilters.party_type === 'depended' && notifFilters.party_okr_id) {
        if (enhanced.depended_okr_id !== notifFilters.party_okr_id) return false;
      }
      return true;
    });
  }, [notifStore.notifications, notifFilters.party_type, notifFilters.party_okr_id]);

  const filteredUnreadCount = useMemo(() => {
    return filteredNotifications.filter((n) => !n.is_read).length;
  }, [filteredNotifications]);

  const selectAllFilteredUnread = () => {
    const unreadIds = filteredNotifications.filter((n) => !n.is_read).map((n) => n.id);
    setSelectedNotifs(unreadIds);
  };

  const loadData = useCallback(async () => {
    const [d, g, o] = await Promise.all([fetchDependencies(), fetchDependencyGraph(), fetchOkrs({ status: 'active' })]);
    setDeps(d);
    setGraphData(g);
    setOkrs(o);
  }, []);

  useEffect(() => {
    loadData();
    const params: Record<string, string> = {};
    if (notifFilters.is_read) params.is_read = notifFilters.is_read;
    if (notifFilters.risk_level) params.risk_level = notifFilters.risk_level;
    notifStore.fetchNotifications(params);
  }, [loadData, notifStore, notifFilters]);

  const handleAdd = async () => {
    if (!depOkrId || !dedOkrId || depOkrId === dedOkrId) return;
    setSubmitting(true);
    try {
      await createDependency({ dependent_okr_id: depOkrId, depended_okr_id: dedOkrId });
      setModalOpen(false);
      setDepOkrId('');
      setDedOkrId('');
      await loadData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDependency(id);
    await loadData();
  };

  const handleExpandDep = async (depId: string) => {
    if (expandedDepId === depId) {
      setExpandedDepId(null);
      setImpactData(null);
      return;
    }
    setExpandedDepId(depId);
    setImpactLoading(true);
    try {
      const data = await fetchDependencyImpact(depId);
      setImpactData(data);
    } catch {
      setImpactData(null);
    } finally {
      setImpactLoading(false);
    }
  };

  const toggleNotifSelect = (id: string) => {
    setSelectedNotifs((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedNotifs([]);
  };

  const handleMarkSelectedRead = async () => {
    if (selectedNotifs.length === 0) return;
    await notifStore.markReadBatch(selectedNotifs);
    setSelectedNotifs([]);
  };

  const selectedDepOkr = useMemo(() => okrs.find((o) => o.id === depOkrId), [okrs, depOkrId]);
  const selectedDedOkr = useMemo(() => okrs.find((o) => o.id === dedOkrId), [okrs, dedOkrId]);

  const nodeMap = new Map(graphData?.nodes.map((n) => [n.id, n]));

  const riskStats = useMemo(() => {
    const critical = deps.filter((d) => d.status === 'critical').length;
    const atRisk = deps.filter((d) => d.status === 'at_risk').length;
    const healthy = deps.filter((d) => d.status === 'healthy').length;
    return { critical, atRisk, healthy, total: deps.length };
  }, [deps]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2">
          <Link2 className="w-6 h-6 text-brand-600" />
          依赖管理工作台
        </h2>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 bg-brand-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />添加依赖
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="text-2xl font-bold text-gray-900">{riskStats.total}</div>
          <div className="text-sm text-gray-500 mt-1">总依赖数</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-green-100">
          <div className="text-2xl font-bold text-green-600">{riskStats.healthy}</div>
          <div className="text-sm text-gray-500 mt-1">健康</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-orange-100">
          <div className="text-2xl font-bold text-orange-600">{riskStats.atRisk}</div>
          <div className="text-sm text-gray-500 mt-1">有风险</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-red-100">
          <div className="text-2xl font-bold text-red-600">{riskStats.critical}</div>
          <div className="text-sm text-gray-500 mt-1">高危</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-display font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Link2 className="w-5 h-5 text-brand-600" />依赖关系总览
        </h3>
        {graphData && graphData.edges.length > 0 ? (
          <div className="space-y-3">
            {graphData.edges.map((edge, i) => {
              const source = nodeMap.get(edge.source);
              const target = nodeMap.get(edge.target);
              const sourceOkr = okrs.find((o) => o.id === edge.source);
              const targetOkr = okrs.find((o) => o.id === edge.target);
              return (
                <div key={i} className={`flex items-center gap-4 p-4 rounded-lg ${edgeStyle(edge.status)}`}>
                  <div className="flex-1 min-w-0">
                    <div
                      onClick={() => source && navigate(`/okrs/${source.id}`)}
                      className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <ProgressRing progress={source?.progress || 0} size={40} strokeWidth={3} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 truncate">{source?.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {source && <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${levelBadge(source.level)}`}>{levelLabel(source.level)}</span>}
                          <span className="text-xs text-gray-500">{sourceOkr?.owner_name || ''}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusBadge(edge.status)}`}>{statusLabel(edge.status)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      onClick={() => target && navigate(`/okrs/${target.id}`)}
                      className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <ProgressRing progress={target?.progress || 0} size={40} strokeWidth={3} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 truncate">{target?.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {target && <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${levelBadge(target.level)}`}>{levelLabel(target.level)}</span>}
                          <span className="text-xs text-gray-500">{targetOkr?.owner_name || ''}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-6">暂无依赖关系</p>
        )}
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-display font-semibold text-gray-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-600" />依赖列表
            </h3>
          </div>
          {deps.length > 0 ? (
            <div className="space-y-2">
              {deps.map((dep: any) => (
                <div key={dep.id}>
                  <div
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div
                        onClick={() => navigate(`/okrs/${dep.dependent_okr_id}`)}
                        className="cursor-pointer hover:text-brand-600 transition-colors"
                      >
                        <p className="text-sm font-medium text-gray-800 truncate">{dep.dependent_okr_title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${levelBadge(dep.dependent_okr_level || 'individual')}`}>
                            {levelLabel(dep.dependent_okr_level || 'individual')}
                          </span>
                          <span className="text-xs text-gray-500">{dep.dependent_owner_name || ''}</span>
                          {dep.dependent_okr_progress !== null && (
                            <div className="w-16">
                              <ProgressBar progress={dep.dependent_okr_progress} height={4} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <ArrowRight className="w-4 h-4 text-gray-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        onClick={() => navigate(`/okrs/${dep.depended_okr_id}`)}
                        className="cursor-pointer hover:text-brand-600 transition-colors"
                      >
                        <p className="text-sm font-medium text-gray-800 truncate">{dep.depended_okr_title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${levelBadge(dep.depended_okr_level || 'individual')}`}>
                            {levelLabel(dep.depended_okr_level || 'individual')}
                          </span>
                          <span className="text-xs text-gray-500">{dep.depended_owner_name || ''}</span>
                          {dep.depended_okr_progress !== null && (
                            <div className="w-16">
                              <ProgressBar progress={dep.depended_okr_progress} height={4} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex-shrink-0 ${statusBadge(dep.status)}`}>{statusLabel(dep.status)}</span>
                    <button
                      onClick={() => handleExpandDep(dep.id)}
                      className={`text-gray-400 hover:text-brand-600 transition-all p-1 flex-shrink-0 ${expandedDepId === dep.id ? 'text-brand-600 rotate-180' : ''}`}
                      title="查看影响链路"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(dep.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1 flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {expandedDepId === dep.id && (
                    <div className="mt-1 ml-4 mr-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      {impactLoading ? (
                        <div className="py-6 text-center">
                          <div className="animate-spin w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full mx-auto mb-2" />
                          <p className="text-xs text-gray-500">加载影响链路...</p>
                        </div>
                      ) : impactData ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <Activity className="w-4 h-4 text-brand-600" />
                            影响链路
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            {impactData.dependent_okr && (
                              <div className="bg-white rounded-lg p-3 border border-gray-100">
                                <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide">依赖方</p>
                                <div
                                  onClick={() => navigate(`/okrs/${impactData.dependent_okr!.id}`)}
                                  className="cursor-pointer hover:text-brand-600 transition-colors"
                                >
                                  <p className="text-sm font-medium text-gray-800 truncate">{impactData.dependent_okr.title}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${levelBadge(impactData.dependent_okr.level)}`}>{levelLabel(impactData.dependent_okr.level)}</span>
                                    <span className="text-xs text-gray-500">{impactData.dependent_okr.owner_name}</span>
                                    <span className="text-xs text-gray-400">{impactData.dependent_okr.overall_progress.toFixed(1)}%</span>
                                  </div>
                                </div>
                              </div>
                            )}
                            {impactData.depended_okr && (
                              <div className="bg-white rounded-lg p-3 border border-gray-100">
                                <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide">被依赖方</p>
                                <div
                                  onClick={() => navigate(`/okrs/${impactData.depended_okr!.id}`)}
                                  className="cursor-pointer hover:text-brand-600 transition-colors"
                                >
                                  <p className="text-sm font-medium text-gray-800 truncate">{impactData.depended_okr.title}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${levelBadge(impactData.depended_okr.level)}`}>{levelLabel(impactData.depended_okr.level)}</span>
                                    <span className="text-xs text-gray-500">{impactData.depended_okr.owner_name}</span>
                                    <span className="text-xs text-gray-400">{impactData.depended_okr.overall_progress.toFixed(1)}%</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {impactData.notifications.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                                <Bell className="w-3.5 h-3.5 text-orange-500" />
                                风险通知 ({impactData.notifications.length})
                              </p>
                              <div className="space-y-1.5">
                                {impactData.notifications.map(n => (
                                  <div key={n.id} className="flex items-start gap-2 p-2 bg-white rounded-lg border border-gray-100 text-xs">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${n.risk_level === 'critical' ? 'bg-red-100 text-red-700' : n.risk_level === 'warning' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                      {n.risk_level === 'critical' ? '严重' : n.risk_level === 'warning' ? '警告' : '提示'}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-gray-700">{n.message}</p>
                                      <p className="text-gray-400 mt-0.5">{n.user_name} · {new Date(n.created_at).toLocaleDateString('zh-CN')}</p>
                                    </div>
                                    {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0 mt-1.5" />}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {impactData.activity_logs.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-brand-500" />
                                相关变更 ({impactData.activity_logs.length})
                              </p>
                              <div className="space-y-1.5">
                                {impactData.activity_logs.map(l => (
                                  <div key={l.id} className="flex items-start gap-2 p-2 bg-white rounded-lg border border-gray-100 text-xs">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${
                                      l.type === 'kr_update' ? 'bg-blue-50 text-blue-700' :
                                      l.type === 'kr_sync' ? 'bg-accent-50 text-accent-700' :
                                      l.type === 'dependency_risk' ? 'bg-orange-50 text-orange-700' :
                                      'bg-gray-50 text-gray-700'
                                    }`}>
                                      {l.type === 'kr_update' ? 'KR更新' : l.type === 'kr_sync' ? '自动同步' : l.type === 'dependency_risk' ? '风险变更' : '状态变更'}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-gray-700">{l.description}</p>
                                      {l.old_value && l.new_value && (
                                        <div className="flex items-center gap-1 mt-0.5">
                                          <span className="text-gray-400">{l.old_value}</span>
                                          <ChevronRight className="w-3 h-3 text-gray-300" />
                                          <span className="text-green-700 font-medium">{l.new_value}</span>
                                        </div>
                                      )}
                                    </div>
                                    <span className="text-gray-400 flex-shrink-0">{new Date(l.created_at).toLocaleDateString('zh-CN')}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {impactData.downstream_okrs.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                                <Target className="w-3.5 h-3.5 text-purple-500" />
                                受影响的下级目标 ({impactData.downstream_okrs.length})
                              </p>
                              <div className="space-y-1.5">
                                {impactData.downstream_okrs.map(o => (
                                  <div
                                    key={o.id}
                                    onClick={() => navigate(`/okrs/${o.id}`)}
                                    className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 text-xs cursor-pointer hover:border-brand-200 transition-colors"
                                  >
                                    <ProgressRing progress={o.overall_progress} size={28} strokeWidth={2} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-gray-700 font-medium truncate">{o.title}</p>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${levelBadge(o.level)}`}>{levelLabel(o.level)}</span>
                                        <span className="text-gray-400">{o.overall_progress.toFixed(1)}%</span>
                                      </div>
                                    </div>
                                    <ChevronRight className="w-3 h-3 text-gray-300" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {impactData.notifications.length === 0 && impactData.activity_logs.length === 0 && impactData.downstream_okrs.length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-4">暂无关联数据</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 text-center py-4">加载失败</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">暂无依赖</p>
          )}
        </div>

        <div className="col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-display font-semibold text-gray-800 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-accent-500" />风险通知
              {notifStore.unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                  全部未读 {notifStore.unreadCount}
                </span>
              )}
              {(notifFilters.party_type || notifFilters.is_read || notifFilters.risk_level) && filteredUnreadCount > 0 && (
                <span className="bg-accent-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                  筛选后未读 {filteredUnreadCount}
                </span>
              )}
            </h3>
          </div>

          <div className="space-y-2 mb-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={notifFilters.is_read}
                onChange={(e) => setNotifFilters((p) => ({ ...p, is_read: e.target.value }))}
                className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-brand-500 outline-none bg-white"
              >
                <option value="">全部状态</option>
                <option value="false">未读</option>
                <option value="true">已读</option>
              </select>
              <select
                value={notifFilters.risk_level}
                onChange={(e) => setNotifFilters((p) => ({ ...p, risk_level: e.target.value }))}
                className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-brand-500 outline-none bg-white"
              >
                <option value="">全部等级</option>
                <option value="critical">严重</option>
                <option value="warning">警告</option>
                <option value="info">提示</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={notifFilters.party_type}
                onChange={(e) => setNotifFilters((p) => ({ ...p, party_type: e.target.value as '' | 'dependent' | 'depended', party_okr_id: '' }))}
                className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-brand-500 outline-none bg-white"
              >
                <option value="">不按依赖方筛选</option>
                <option value="dependent">按依赖方筛选</option>
                <option value="depended">按被依赖方筛选</option>
              </select>
              {notifFilters.party_type && notificationOkrs.length > 0 && (
                <select
                  value={notifFilters.party_okr_id}
                  onChange={(e) => setNotifFilters((p) => ({ ...p, party_okr_id: e.target.value }))}
                  className="flex-2 border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-brand-500 outline-none bg-white"
                >
                  <option value="">全部{notifFilters.party_type === 'dependent' ? '依赖方' : '被依赖方'}</option>
                  {notificationOkrs.map((o) => (
                    <option key={o.id} value={o.id}>{o.title}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={selectAllFilteredUnread}
              className="text-xs text-brand-600 hover:text-brand-800 transition-colors"
            >
              全选筛选后未读
            </button>
            <span className="text-gray-200">|</span>
            <button
              onClick={clearSelection}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              清空选择
            </button>
            {selectedNotifs.length > 0 && (
              <>
                <span className="text-xs text-gray-400 ml-auto">已选 {selectedNotifs.length} 条</span>
                <button
                  onClick={handleMarkSelectedRead}
                  className="flex items-center gap-1 text-xs bg-brand-800 text-white px-2 py-1 rounded hover:bg-brand-700 transition-colors"
                >
                  <CheckSquare className="w-3 h-3" />标记已读
                </button>
              </>
            )}
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {filteredNotifications.map((n: Notification) => (
              <div
                key={n.id}
                className={`p-3 rounded-lg border transition-all ${
                  selectedNotifs.includes(n.id)
                    ? 'border-brand-300 bg-brand-50'
                    : n.is_read
                    ? 'border-gray-100 bg-white'
                    : 'border-l-4 border-l-accent-500 border-gray-100 bg-accent-500/5'
                }`}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={selectedNotifs.includes(n.id)}
                    onChange={() => toggleNotifSelect(n.id)}
                    className="mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Bell className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          n.risk_level === 'critical'
                            ? 'bg-red-100 text-red-700'
                            : n.risk_level === 'warning'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {n.risk_level === 'critical' ? '严重' : n.risk_level === 'warning' ? '警告' : '提示'}
                      </span>
                      {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-accent-500 flex-shrink-0" />}
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-gray-400">{new Date(n.created_at).toLocaleString('zh-CN')}</span>
                      {(n as any).depended_okr_title && (
                        <button
                          onClick={() => navigate(`/okrs/${n.depended_okr_id}`)}
                          className="text-xs text-brand-600 hover:text-brand-800 flex items-center gap-0.5 ml-auto"
                        >
                          查看OKR <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {!n.is_read && (
                      <button
                        onClick={() => notifStore.markRead(n.id)}
                        className="text-xs text-gray-500 hover:text-brand-600 mt-1"
                      >
                        标记已读
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {notifStore.notifications.length === 0 && <p className="text-gray-400 text-sm text-center py-8">暂无通知</p>}
          </div>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="添加依赖关系">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">依赖方OKR（需要依赖别人的）</label>
            <select
              value={depOkrId}
              onChange={(e) => setDepOkrId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
            >
              <option value="">请选择依赖方OKR</option>
              {okrs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
            {selectedDepOkr && (
              <div className="mt-3 p-3 bg-brand-50 rounded-lg border border-brand-100">
                <div className="flex items-center gap-3">
                  <ProgressRing progress={selectedDepOkr.overall_progress} size={36} strokeWidth={3} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{selectedDepOkr.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${levelBadge(selectedDepOkr.level)}`}>
                        {levelLabel(selectedDepOkr.level)}
                      </span>
                      <span className="text-xs text-gray-500">负责人: {(selectedDepOkr as any).owner_name || '未指定'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <ArrowRight className="w-5 h-5 text-gray-300" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">被依赖方OKR（被依赖的）</label>
            <select
              value={dedOkrId}
              onChange={(e) => setDedOkrId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
            >
              <option value="">请选择被依赖方OKR</option>
              {okrs
                .filter((o) => o.id !== depOkrId)
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title}
                  </option>
                ))}
            </select>
            {selectedDedOkr && (
              <div className="mt-3 p-3 bg-accent-50 rounded-lg border border-accent-100">
                <div className="flex items-center gap-3">
                  <ProgressRing progress={selectedDedOkr.overall_progress} size={36} strokeWidth={3} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{selectedDedOkr.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${levelBadge(selectedDedOkr.level)}`}>
                        {levelLabel(selectedDedOkr.level)}
                      </span>
                      <span className="text-xs text-gray-500">负责人: {(selectedDedOkr as any).owner_name || '未指定'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleAdd}
            disabled={!depOkrId || !dedOkrId || submitting || depOkrId === dedOkrId}
            className="w-full bg-brand-800 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? '添加中...' : '确认添加依赖'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
