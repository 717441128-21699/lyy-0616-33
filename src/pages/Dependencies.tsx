import { useState, useEffect, useCallback } from 'react';
import { Link2, Plus, Trash2, Bell, ArrowRight, ShieldAlert } from 'lucide-react';
import type { OKR, Dependency, DependencyGraphData, Notification } from '@/types';
import { fetchOkrs, fetchDependencies, fetchDependencyGraph, createDependency, deleteDependency } from '@/api';
import ProgressRing from '@/components/ProgressRing';
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
  return '关键';
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

export default function Dependencies() {
  const [deps, setDeps] = useState<Dependency[]>([]);
  const [graphData, setGraphData] = useState<DependencyGraphData | null>(null);
  const [okrs, setOkrs] = useState<OKR[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [depOkrId, setDepOkrId] = useState('');
  const [dedOkrId, setDedOkrId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const notifStore = useNotificationStore();

  const loadData = useCallback(async () => {
    const [d, g, o] = await Promise.all([fetchDependencies(), fetchDependencyGraph(), fetchOkrs({ status: 'active' })]);
    setDeps(d);
    setGraphData(g);
    setOkrs(o);
  }, []);

  useEffect(() => { loadData(); notifStore.fetchNotifications(); }, [loadData, notifStore]);

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

  const nodeMap = new Map(graphData?.nodes.map((n) => [n.id, n]));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold text-gray-900">依赖管理</h2>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-display font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Link2 className="w-5 h-5 text-brand-600" />依赖关系图
        </h3>
        {graphData && graphData.edges.length > 0 ? (
          <div className="space-y-3">
            {graphData.edges.map((edge, i) => {
              const source = nodeMap.get(edge.source);
              const target = nodeMap.get(edge.target);
              return (
                <div key={i} className={`flex items-center gap-4 p-4 rounded-lg ${edgeStyle(edge.status)}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <ProgressRing progress={source?.progress || 0} size={36} strokeWidth={3} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{source?.title}</p>
                        {source && <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${levelBadge(source.level)}`}>{source.level === 'company' ? '公司' : source.level === 'department' ? '部门' : '个人'}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusBadge(edge.status)}`}>{statusLabel(edge.status)}</span>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <ProgressRing progress={target?.progress || 0} size={36} strokeWidth={3} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{target?.title}</p>
                        {target && <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${levelBadge(target.level)}`}>{target.level === 'company' ? '公司' : target.level === 'department' ? '部门' : '个人'}</span>}
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

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-display font-semibold text-gray-800">依赖列表</h3>
            <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 bg-brand-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
              <Plus className="w-4 h-4" />添加依赖
            </button>
          </div>
          {deps.length > 0 ? (
            <div className="space-y-2">
              {deps.map((dep) => (
                <div key={dep.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                  <span className="flex-1 text-sm text-gray-700 truncate">{dep.dependent_okr_title || dep.dependent_okr_id}</span>
                  <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="flex-1 text-sm text-gray-700 truncate">{dep.depended_okr_title || dep.depended_okr_id}</span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${statusBadge(dep.status)}`}>{statusLabel(dep.status)}</span>
                  <button onClick={() => handleDelete(dep.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">暂无依赖</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-display font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <ShieldAlert className="w-5 h-5 text-accent-500" />风险通知
            {notifStore.unreadCount > 0 && <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">{notifStore.unreadCount}</span>}
          </h3>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {notifStore.notifications.map((n: Notification) => (
              <div key={n.id} onClick={() => !n.is_read && notifStore.markRead(n.id)} className={`p-3 rounded-lg border cursor-pointer transition-colors ${n.is_read ? 'border-gray-100 bg-white' : 'border-l-4 border-l-accent-500 border-gray-100 bg-accent-500/5'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Bell className="w-3.5 h-3.5 text-gray-400" />
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${n.risk_level === 'critical' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                    {n.risk_level === 'critical' ? '严重' : '警告'}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleDateString('zh-CN')}</p>
              </div>
            ))}
            {notifStore.notifications.length === 0 && <p className="text-gray-400 text-sm text-center py-8">暂无通知</p>}
          </div>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="添加依赖">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">依赖方OKR</label>
            <select value={depOkrId} onChange={(e) => setDepOkrId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none">
              <option value="">请选择</option>
              {okrs.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">被依赖方OKR</label>
            <select value={dedOkrId} onChange={(e) => setDedOkrId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none">
              <option value="">请选择</option>
              {okrs.filter((o) => o.id !== depOkrId).map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          </div>
          <button onClick={handleAdd} disabled={!depOkrId || !dedOkrId || submitting} className="w-full bg-brand-800 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {submitting ? '添加中...' : '确认添加'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
