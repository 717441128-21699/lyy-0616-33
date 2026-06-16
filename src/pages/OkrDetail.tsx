import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit3, Plus, Trash2, Archive, ChevronRight, Save, RefreshCw, ExternalLink, Activity, FileText, AlertTriangle, Zap, Clock } from 'lucide-react';
import { fetchOkrById, fetchWeeklyUpdates, updateKeyResultProgress, deleteKeyResult, createKeyResult, updateOkr, archiveOkr, fetchOkrs, syncKeyResult, fetchOkrById as getOkrDetail, fetchActivityLogs } from '@/api';
import type { OKRWithDetails, KeyResult, WeeklyUpdate, OKR, ActivityLog } from '@/types';
import ProgressRing from '@/components/ProgressRing';
import ProgressBar from '@/components/ProgressBar';
import Modal from '@/components/Modal';

const LB: Record<string, string> = { company: 'bg-blue-100 text-blue-700', department: 'bg-purple-100 text-purple-700', individual: 'bg-teal-100 text-teal-700' };
const LL: Record<string, string> = { company: '公司级', department: '部门级', individual: '个人级' };
const SB: Record<string, string> = { draft: 'bg-gray-100 text-gray-600', active: 'bg-green-100 text-green-700', completed: 'bg-blue-100 text-blue-700', archived: 'bg-yellow-100 text-yellow-700' };
const SL: Record<string, string> = { draft: '草稿', active: '进行中', completed: '已完成', archived: '已归档' };

const logTypeConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  kr_update: { icon: Activity, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'KR更新' },
  kr_sync: { icon: Zap, color: 'text-accent-600', bgColor: 'bg-accent-100', label: '自动同步' },
  weekly_update: { icon: FileText, color: 'text-brand-600', bgColor: 'bg-brand-100', label: '周报提交' },
  review: { icon: Clock, color: 'text-purple-600', bgColor: 'bg-purple-100', label: '复盘评分' },
  dependency_risk: { icon: AlertTriangle, color: 'text-orange-600', bgColor: 'bg-orange-100', label: '风险变更' },
  status_change: { icon: Activity, color: 'text-gray-600', bgColor: 'bg-gray-100', label: '状态变更' },
};

function KrCard({ kr, okrId, onRefresh }: { kr: KeyResult; okrId: string; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(kr.current_value);
  const [syncing, setSyncing] = useState(false);
  const save = async () => { await updateKeyResultProgress(okrId, kr.id, value); setEditing(false); onRefresh(); };
  const del = async () => { await deleteKeyResult(okrId, kr.id); onRefresh(); };
  const handleSync = async () => {
    setSyncing(true);
    try { await syncKeyResult(okrId, kr.id); onRefresh(); }
    finally { setSyncing(false); }
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-start gap-4">
        <ProgressRing progress={kr.progress} size={56} strokeWidth={4} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div><h4 className="font-medium text-gray-900">{kr.title}</h4><p className="text-sm text-gray-500 mt-0.5">{kr.current_value} / {kr.target_value} {kr.unit}</p></div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${kr.update_method === 'manual' ? 'bg-gray-100 text-gray-600' : 'bg-brand-50 text-brand-700'}`}>{kr.update_method === 'manual' ? '手动' : '自动'}</span>
          </div>
          {kr.update_method === 'auto' && kr.data_source_url && (
            <div className="text-xs text-gray-400 mt-1 flex items-center gap-1"><ExternalLink className="w-3 h-3" />{kr.data_source_url}</div>
          )}
          <div className="mt-2"><ProgressBar progress={kr.progress} height={6} /></div>
          <div className="flex items-center gap-2 mt-3">
            {editing ? (
              <><input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} className="w-24 px-2 py-1 border border-gray-200 rounded text-sm" step="0.1" />
              <button onClick={save} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save className="w-4 h-4" /></button></>
            ) : (
              <button onClick={() => { setEditing(true); setValue(kr.current_value); }} className="text-xs font-medium text-brand-600 hover:text-brand-800 px-2 py-1 rounded hover:bg-brand-50 transition-colors">更新进度</button>
            )}
            {kr.update_method === 'auto' && (
              <button onClick={handleSync} disabled={syncing} className="text-xs font-medium text-accent-600 hover:text-accent-700 px-2 py-1 rounded hover:bg-accent-50 transition-colors flex items-center gap-1 disabled:opacity-50">
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />{syncing ? '同步中...' : '同步数据'}
              </button>
            )}
            <button onClick={del} className="text-xs font-medium text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors flex items-center gap-1 ml-auto"><Trash2 className="w-3.5 h-3.5" />删除</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WeekItem({ update }: { update: WeeklyUpdate }) {
  const cc = update.confidence_index <= 3 ? 'bg-red-100 text-red-700' : update.confidence_index <= 6 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700';
  return (
    <div className="flex gap-4 relative pb-6">
      <div className="flex flex-col items-center">
        <div className="w-3 h-3 rounded-full bg-brand-500 ring-4 ring-brand-50 flex-shrink-0" />
        <div className="w-0.5 flex-1 bg-gray-200" />
      </div>
      <div className="flex-1 -mt-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-gray-500">第{update.week_number}周</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${cc}`}>信心指数 {update.confidence_index}</span>
          <span className="text-xs text-gray-400">{new Date(update.created_at).toLocaleDateString()}</span>
        </div>
        <p className="text-sm text-gray-700">{update.progress_description}</p>
        <p className="text-xs text-gray-400 mt-1">KR当前值: {update.kr_current_value}</p>
      </div>
    </div>
  );
}

export default function OkrDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [okr, setOkr] = useState<OKRWithDetails | null>(null);
  const [parentOkr, setParentOkr] = useState<OKR | null>(null);
  const [updates, setUpdates] = useState<WeeklyUpdate[]>([]);
  const [children, setChildren] = useState<OKR[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [showAddKr, setShowAddKr] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '', status: '' as OKRWithDetails['status'] });
  const [krForm, setKrForm] = useState({ title: '', target_value: 100, unit: '', update_method: 'manual' as KeyResult['update_method'], data_source_url: '' });

  const load = useCallback(async () => {
    if (!id) return;
    const data = await fetchOkrById(id);
    setOkr(data);
    if (data.parent_okr_id) {
      try {
        const parent = await getOkrDetail(data.parent_okr_id);
        setParentOkr(parent);
      } catch { setParentOkr(null); }
    } else {
      setParentOkr(null);
    }
    const w = await fetchWeeklyUpdates({ okr_id: id });
    setUpdates(w);
    const c = await fetchOkrs({ parent_okr_id: id });
    setChildren(c);
    const logs = await fetchActivityLogs(id);
    setActivityLogs(logs);
  }, [id]);

  useEffect(() => { load(); }, [load]);
  if (!okr) return <div className="text-center py-12 text-gray-400">加载中...</div>;

  const handleEdit = async () => { if (!id) return; await updateOkr(id, editForm); setEditing(false); load(); };
  const handleAddKr = async () => {
    if (!id || !krForm.title.trim()) return;
    const payload = { ...krForm, data_source_url: krForm.update_method === 'auto' ? krForm.data_source_url || null : null };
    await createKeyResult(id, payload);
    setShowAddKr(false);
    setKrForm({ title: '', target_value: 100, unit: '', update_method: 'manual', data_source_url: '' });
    load();
  };
  const handleArchive = async () => { if (!id) return; await archiveOkr(id); navigate('/okrs'); };
  const startEdit = () => { setEditForm({ title: okr.title, description: okr.description, status: okr.status }); setEditing(true); };

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/okrs')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-brand-600 transition-colors"><ArrowLeft className="w-4 h-4" />返回列表</button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <ProgressRing progress={okr.overall_progress} size={72} />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LB[okr.level]}`}>{LL[okr.level]}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SB[okr.status]}`}>{SL[okr.status]}</span>
              </div>
              {editing ? <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="text-xl font-display font-bold text-gray-900 border-b border-brand-300 focus:outline-none" />
                : <h2 className="text-xl font-display font-bold text-gray-900">{okr.title}</h2>}
              {editing ? <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="text-sm text-gray-600 mt-1 w-full border-b border-gray-200 focus:outline-none" rows={2} />
                : <p className="text-sm text-gray-500 mt-1">{okr.description}</p>}
              <p className="text-xs text-gray-400 mt-1">{okr.owner_name || '未指定'} · {okr.quarter} {okr.year}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <><select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as OKRWithDetails['status'] })} className="px-2 py-1 border border-gray-200 rounded text-sm bg-white"><option value="draft">草稿</option><option value="active">进行中</option><option value="completed">已完成</option></select>
              <button onClick={handleEdit} className="px-3 py-1.5 bg-brand-800 text-white rounded-lg text-sm font-medium hover:bg-brand-900">保存</button>
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm">取消</button></>
            ) : (
              <button onClick={startEdit} className="flex items-center gap-1 px-3 py-1.5 text-sm text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"><Edit3 className="w-4 h-4" />编辑</button>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-display font-semibold text-gray-900">关键结果</h3>
          <button onClick={() => setShowAddKr(true)} className="flex items-center gap-1 px-3 py-1.5 bg-accent-500 text-white rounded-lg text-sm font-medium hover:bg-accent-600"><Plus className="w-4 h-4" />添加KR</button>
        </div>
        <div className="space-y-3">
          {okr.key_results.map((kr) => <KrCard key={kr.id} kr={kr} okrId={okr.id} onRefresh={load} />)}
          {okr.key_results.length === 0 && <p className="text-gray-400 text-sm text-center py-6">暂无关键结果</p>}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-display font-semibold text-gray-900 mb-4">对齐关系</h3>
        <div className="space-y-4">
          <div>
            <span className="text-sm text-gray-500 mb-2 block">上级OKR</span>
            {parentOkr ? (
              <Link to={`/okrs/${parentOkr.id}`} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                <ProgressRing progress={parentOkr.overall_progress} size={40} strokeWidth={3} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${LB[parentOkr.level as keyof typeof LB]}`}>{LL[parentOkr.level as keyof typeof LL]}</span>
                    <h4 className="font-medium text-gray-900 truncate">{parentOkr.title}</h4>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{(parentOkr as any).owner_name || '未指定'}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>
            ) : <p className="text-sm text-gray-400 p-3">无上级OKR</p>}
          </div>
          <div>
            <span className="text-sm text-gray-500 mb-2 block">下级OKR</span>
            {children.length > 0 ? (
              <div className="space-y-2">
                {children.map((c) => (
                  <Link key={c.id} to={`/okrs/${c.id}`} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                    <ProgressRing progress={c.overall_progress} size={40} strokeWidth={3} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${LB[c.level as keyof typeof LB]}`}>{LL[c.level as keyof typeof LL]}</span>
                        <h4 className="font-medium text-gray-900 truncate">{c.title}</h4>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{(c as any).owner_name || '未指定'}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Link>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400 p-3">暂无下级OKR</p>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-display font-semibold text-gray-900 mb-4">变更时间线</h3>
        {activityLogs.length === 0 ? <p className="text-gray-400 text-sm text-center py-6">暂无变更记录</p>
          : (
            <div className="space-y-1">
              {activityLogs.map((log) => {
                const config = logTypeConfig[log.type] || logTypeConfig.kr_update;
                const Icon = config.icon;
                return (
                  <div key={log.id} className="flex gap-3 relative pb-4 group">
                    <div className="flex flex-col items-center z-10">
                      <div className={`w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div className="w-0.5 flex-1 bg-gray-100" />
                    </div>
                    <div className="flex-1 -mt-0.5 pb-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${config.bgColor} ${config.color}`}>{config.label}</span>
                        <span className="text-xs text-gray-500">{log.actor_name || '未知'}</span>
                        <span className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString('zh-CN')}</span>
                      </div>
                      <p className="text-sm text-gray-700">{log.description}</p>
                      {(log.old_value || log.new_value) && (
                        <div className="flex items-center gap-2 mt-1.5 text-xs">
                          {log.old_value && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded">{log.old_value}</span>}
                          {log.old_value && log.new_value && <ChevronRight className="w-3 h-3 text-gray-300" />}
                          {log.new_value && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded font-medium">{log.new_value}</span>}
                        </div>
                      )}
                      {log.detail && log.type === 'weekly_update' && (
                        <div className="mt-2 p-2 bg-gray-50 rounded-lg text-xs text-gray-600">
                          <p>信心指数: {(log.detail as any).confidence_index}/10</p>
                          <p className="mt-1">{(log.detail as any).progress_description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>

      {okr.status === 'completed' && (
        <button onClick={handleArchive} className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors"><Archive className="w-4 h-4" />归档此OKR</button>
      )}

      <Modal isOpen={showAddKr} onClose={() => setShowAddKr(false)} title="添加关键结果">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">标题</label><input value={krForm.title} onChange={(e) => setKrForm({ ...krForm, title: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="输入KR标题" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">目标值</label><input type="number" value={krForm.target_value} onChange={(e) => setKrForm({ ...krForm, target_value: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">单位</label><input value={krForm.unit} onChange={(e) => setKrForm({ ...krForm, unit: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="如: %, 个, 万元" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">更新方式</label><select value={krForm.update_method} onChange={(e) => setKrForm({ ...krForm, update_method: e.target.value as KeyResult['update_method'] })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"><option value="manual">手动</option><option value="auto">自动</option></select></div>
          {krForm.update_method === 'auto' && (
            <div><label className="block text-sm font-medium text-gray-700 mb-1">数据源地址</label><input value={krForm.data_source_url} onChange={(e) => setKrForm({ ...krForm, data_source_url: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="https://..." /></div>
          )}
          <button onClick={handleAddKr} disabled={!krForm.title.trim()} className="w-full py-2 bg-brand-800 text-white rounded-lg text-sm font-medium hover:bg-brand-900 disabled:opacity-50 disabled:cursor-not-allowed">添加</button>
        </div>
      </Modal>
    </div>
  );
}
