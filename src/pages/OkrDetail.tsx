import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Edit3, Plus, Trash2, Archive, ChevronRight, Save, RefreshCw, ExternalLink, Activity, FileText, AlertTriangle, Zap, Clock, X, MapPin, Copy, CheckCircle2, ClipboardList } from 'lucide-react';
import { fetchOkrById, fetchWeeklyUpdates, updateKeyResultProgress, deleteKeyResult, createKeyResult, updateOkr, archiveOkr, fetchOkrs, syncKeyResult, fetchOkrById as getOkrDetail, fetchActivityLogs, fetchReviewsByOkr, fetchDependencies } from '@/api';
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

function KrCard({ kr, okrId, onRefresh, highlight, onHighlightClear }: { kr: KeyResult; okrId: string; onRefresh: () => void; highlight?: boolean; onHighlightClear?: () => void }) {
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
    <div
      id={`kr-${kr.id}`}
      className={`bg-white rounded-xl shadow-sm border p-4 transition-all ${highlight ? 'border-brand-400 ring-2 ring-brand-200 shadow-md' : 'border-gray-100'}`}
      onAnimationEnd={onHighlightClear}
      style={highlight ? { animation: 'pulse 2s ease-in-out' } : undefined}
    >
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

export default function OkrDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [okr, setOkr] = useState<OKRWithDetails | null>(null);
  const [parentOkr, setParentOkr] = useState<OKR | null>(null);
  const [updates, setUpdates] = useState<WeeklyUpdate[]>([]);
  const [children, setChildren] = useState<OKR[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [showAddKr, setShowAddKr] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '', status: '' as OKRWithDetails['status'] });
  const [krForm, setKrForm] = useState({ title: '', target_value: 100, unit: '', update_method: 'manual' as KeyResult['update_method'], data_source_url: '' });
  const [highlightKrId, setHighlightKrId] = useState<string | null>(null);
  const [dismissContext, setDismissContext] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [showReviewAssistant, setShowReviewAssistant] = useState(false);
  const [copied, setCopied] = useState(false);

  const reviewAssistantData = useMemo(() => {
    if (!okr) return null;
    const laggingKrs = okr.key_results.filter(kr => kr.progress < 50).sort((a, b) => a.progress - b.progress);
    const recentWeekly = updates.slice(0, 3);
    const riskLogs = activityLogs.filter(l => l.type === 'dependency_risk');
    const reviewLogs = activityLogs.filter(l => l.type === 'review');
    return { laggingKrs, recentWeekly, riskLogs, reviewLogs };
  }, [okr, updates, activityLogs]);

  const reviewAssistantText = useMemo(() => {
    if (!reviewAssistantData || !okr) return '';
    const d = reviewAssistantData;
    let text = `📋 ${okr.title} - 季度复盘待关注清单\n`;
    text += `进度: ${okr.overall_progress.toFixed(1)}%\n\n`;

    if (d.laggingKrs.length > 0) {
      text += `🔴 落后KR (${d.laggingKrs.length}条)\n`;
      d.laggingKrs.forEach(kr => {
        text += `  - ${kr.title}: ${kr.current_value}/${kr.target_value}${kr.unit} (${kr.progress.toFixed(1)}%)\n`;
      });
      text += '\n';
    }

    if (d.recentWeekly.length > 0) {
      text += `📝 最近周报\n`;
      d.recentWeekly.forEach(w => {
        text += `  第${w.week_number}周(信心${w.confidence_index}/10): ${w.progress_description}\n`;
      });
      text += '\n';
    }

    if (d.riskLogs.length > 0) {
      text += `⚠️ 依赖风险\n`;
      d.riskLogs.forEach(l => {
        text += `  - ${l.description}\n`;
      });
      text += '\n';
    }

    if (d.reviewLogs.length > 0) {
      text += `📊 复盘记录\n`;
      d.reviewLogs.forEach(l => {
        const detail = l.detail as Record<string, unknown> | undefined;
        if (detail) {
          text += `  评分: ${(detail.overall_score as number)?.toFixed(1)}\n`;
          if (detail.what_to_improve) text += `  待改进: ${detail.what_to_improve as string}\n`;
          if (detail.next_actions) text += `  下一步: ${detail.next_actions as string}\n`;
        }
      });
    }

    return text;
  }, [reviewAssistantData, okr]);

  const handleCopyAssistant = async () => {
    try {
      await navigator.clipboard.writeText(reviewAssistantText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

  const toggleLogExpand = (logId: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const context = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const from = params.get('from');
    if (from !== 'heatmap') return null;
    return {
      from,
      progress: params.get('progress'),
      risk: params.get('risk'),
      member: params.get('member'),
      laggard: params.get('laggard') === 'true',
    };
  }, [location.search]);

  const relevantKrs = useMemo(() => {
    if (!okr) return [];
    return okr.key_results.filter(kr => kr.progress < 50).sort((a, b) => a.progress - b.progress);
  }, [okr]);

  const recentUpdates = useMemo(() => {
    return updates.slice(0, 2);
  }, [updates]);

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

      {context && !dismissContext && (
        <div className="bg-gradient-to-r from-brand-50 to-purple-50 border border-brand-200 rounded-xl p-4 relative">
          <button onClick={() => setDismissContext(true)} className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-brand-700 px-2 py-0.5 bg-white rounded-full">来自热力图</span>
                {context.laggard && <span className="text-xs font-bold text-accent-600 px-2 py-0.5 bg-white rounded-full">落后项</span>}
                {context.risk && context.risk !== 'healthy' && (
                  <span className={`text-xs font-bold px-2 py-0.5 bg-white rounded-full ${context.risk === 'critical' ? 'text-red-600' : 'text-orange-600'}`}>
                    {context.risk === 'critical' ? '高危' : '有风险'}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700">
                您从热力图点击查看此OKR，当前进度 <span className="font-semibold text-brand-700">{context.progress}%</span>
              </p>

              {relevantKrs.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-accent-500" />
                    需要关注的KR
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {relevantKrs.map((kr) => (
                      <button
                        key={kr.id}
                        onClick={() => { setHighlightKrId(kr.id); document.getElementById(`kr-${kr.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
                        className="text-xs px-3 py-1.5 bg-white rounded-lg border border-gray-200 hover:border-brand-300 hover:shadow-sm transition-all text-left max-w-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-gray-700 truncate">{kr.title}</span>
                          <span className={`font-bold ${kr.progress < 30 ? 'text-red-500' : 'text-accent-500'}`}>{Math.round(kr.progress)}%</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {recentUpdates.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-brand-500" />
                    最近周报
                  </p>
                  <div className="space-y-2">
                    {recentUpdates.map((update) => (
                      <div key={update.id} className="text-xs p-2.5 bg-white rounded-lg border border-gray-100">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-gray-500">第{update.week_number}周</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${update.confidence_index >= 7 ? 'bg-green-100 text-green-700' : update.confidence_index >= 4 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                            信心 {update.confidence_index}/10
                          </span>
                          <span className="text-gray-400">{new Date(update.created_at).toLocaleDateString('zh-CN')}</span>
                        </div>
                        <p className="text-gray-600">{update.progress_description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
              <>
                <button onClick={() => setShowReviewAssistant(!showReviewAssistant)} className="flex items-center gap-1 px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"><ClipboardList className="w-4 h-4" />复盘助手</button>
                <button onClick={startEdit} className="flex items-center gap-1 px-3 py-1.5 text-sm text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"><Edit3 className="w-4 h-4" />编辑</button>
              </>
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
          {okr.key_results.map((kr) => <KrCard key={kr.id} kr={kr} okrId={okr.id} onRefresh={load} highlight={highlightKrId === kr.id} onHighlightClear={() => setHighlightKrId(null)} />)}
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
                  <p className="text-xs text-gray-400 mt-0.5">{parentOkr.owner_name || '未指定'}</p>
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
                      <p className="text-xs text-gray-400 mt-0.5">{c.owner_name || '未指定'}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Link>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400 p-3">暂无下级OKR</p>}
          </div>
        </div>
      </div>

      {showReviewAssistant && reviewAssistantData && (
        <div className="bg-gradient-to-r from-purple-50 to-brand-50 rounded-xl shadow-sm border border-purple-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-display font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-purple-600" />
              复盘助手
              <span className="text-sm font-normal text-gray-400">待关注清单</span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyAssistant}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  copied ? 'bg-green-100 text-green-700' : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? '已复制' : '复制清单'}
              </button>
              <button onClick={() => setShowReviewAssistant(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviewAssistantData.laggingKrs.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-red-100">
                <h4 className="text-sm font-semibold text-red-800 mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  落后KR ({reviewAssistantData.laggingKrs.length})
                </h4>
                <div className="space-y-2">
                  {reviewAssistantData.laggingKrs.map(kr => (
                    <div key={kr.id} className="flex items-center gap-2 text-sm">
                      <span className={`font-bold ${kr.progress < 30 ? 'text-red-600' : 'text-orange-600'}`}>{kr.progress.toFixed(1)}%</span>
                      <span className="text-gray-700 flex-1 truncate">{kr.title}</span>
                      <span className="text-xs text-gray-400">{kr.current_value}/{kr.target_value}{kr.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reviewAssistantData.recentWeekly.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-brand-100">
                <h4 className="text-sm font-semibold text-brand-800 mb-3 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-brand-500" />
                  最近周报
                </h4>
                <div className="space-y-2">
                  {reviewAssistantData.recentWeekly.map(w => (
                    <div key={w.id} className="text-sm">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs text-gray-500">第{w.week_number}周</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${w.confidence_index >= 7 ? 'bg-green-100 text-green-700' : w.confidence_index >= 4 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                          信心 {w.confidence_index}/10
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">{w.progress_description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reviewAssistantData.riskLogs.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-orange-100">
                <h4 className="text-sm font-semibold text-orange-800 mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  依赖风险
                </h4>
                <div className="space-y-1.5">
                  {reviewAssistantData.riskLogs.map(l => (
                    <p key={l.id} className="text-xs text-gray-600">{l.description}</p>
                  ))}
                </div>
              </div>
            )}

            {reviewAssistantData.reviewLogs.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-purple-100">
                <h4 className="text-sm font-semibold text-purple-800 mb-3 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-purple-500" />
                  复盘评分
                </h4>
                <div className="space-y-2">
                  {reviewAssistantData.reviewLogs.map(l => {
                    const d = l.detail as Record<string, unknown> | undefined;
                    return (
                      <div key={l.id} className="text-xs space-y-1">
                        <span className="font-bold text-purple-700">{(d?.overall_score as number)?.toFixed(1)}分</span>
                        {d?.what_to_improve && <p className="text-gray-600">待改进: {d.what_to_improve as string}</p>}
                        {d?.next_actions && <p className="text-gray-600">下一步: {d.next_actions as string}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {reviewAssistantData.laggingKrs.length === 0 && reviewAssistantData.riskLogs.length === 0 && (
              <div className="bg-white rounded-lg p-4 border border-green-100 md:col-span-2">
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">此OKR当前状态良好，无落后KR和风险依赖</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-display font-semibold text-gray-900 mb-4">变更时间线</h3>
        {activityLogs.length === 0 ? <p className="text-gray-400 text-sm text-center py-6">暂无变更记录</p>
          : (
            <div className="space-y-1">
              {activityLogs.map((log) => {
                const config = logTypeConfig[log.type] || logTypeConfig.kr_update;
                const Icon = config.icon;
                const isExpanded = expandedLogs.has(log.id);
                const detail = log.detail as Record<string, unknown> | undefined;

                const renderAuditDetail = () => {
                  if (!detail && !log.old_value && !log.new_value) return null;

                  return (
                    <div className="mt-3 space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-gray-500">
                        <span className="px-2 py-0.5 bg-gray-100 rounded font-medium">审计记录</span>
                        <span className="text-[10px] text-gray-400">操作时间: {new Date(log.created_at).toLocaleString('zh-CN')}</span>
                      </div>

                      {(log.old_value || log.new_value) && (
                        <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
                          {log.old_value && (
                            <div>
                              <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide">变更前</p>
                              <p className="text-sm font-mono text-gray-600 bg-white px-2 py-1 rounded">{log.old_value}</p>
                            </div>
                          )}
                          {log.new_value && (
                            <div>
                              <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide">变更后</p>
                              <p className="text-sm font-mono text-green-700 bg-white px-2 py-1 rounded">{log.new_value}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {detail && (log.type === 'kr_update' || log.type === 'kr_sync') && detail.kr_title && (
                        <div className={`p-3 rounded-lg ${log.type === 'kr_sync' ? 'bg-accent-50' : 'bg-blue-50'}`}>
                          <p className={`text-[10px] mb-1 uppercase tracking-wide ${log.type === 'kr_sync' ? 'text-accent-400' : 'text-blue-400'}`}>
                            {log.type === 'kr_sync' ? '自动同步KR' : '关联KR'}
                          </p>
                          <p className="text-sm font-medium text-gray-700">{detail.kr_title as string}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span>目标: {detail.kr_target as number}{detail.kr_unit as string}</span>
                            <span>当前: {detail.kr_current as number}{detail.kr_unit as string}</span>
                            <span>进度: {Math.round(detail.kr_progress as number)}%</span>
                          </div>
                          {log.type === 'kr_sync' && detail.kr_method && (
                            <p className="text-xs text-accent-600 mt-1.5">
                              同步方式: {detail.kr_method === 'auto' ? '自动数据源' : '手动触发'}
                              {detail.kr_source_url && <span className="text-gray-400 ml-1">({detail.kr_source_url as string})</span>}
                            </p>
                          )}
                        </div>
                      )}

                      {detail && log.type === 'weekly_update' && (
                        <div className="p-3 bg-brand-50 rounded-lg">
                          <p className="text-[10px] text-brand-400 mb-1 uppercase tracking-wide">关联周报</p>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-gray-600">第{detail.week_number as number}周</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${(detail.confidence_index as number) >= 7 ? 'bg-green-100 text-green-700' : (detail.confidence_index as number) >= 4 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                              信心 {(detail.confidence_index as number)}/10
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{detail.progress_description as string}</p>
                        </div>
                      )}

                      {detail && log.type === 'review' && (
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <p className="text-[10px] text-purple-400 mb-1 uppercase tracking-wide">关联复盘</p>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-gray-600">{detail.year as number}年{detail.quarter as string}</span>
                            <span className="text-lg font-bold text-purple-700">{(detail.overall_score as number).toFixed(1)}分</span>
                          </div>
                          {(detail.what_went_well as string) && (
                            <div className="mt-2">
                              <p className="text-[10px] text-green-600 mb-0.5">做得好的</p>
                              <p className="text-xs text-gray-600">{detail.what_went_well as string}</p>
                            </div>
                          )}
                          {(detail.what_to_improve as string) && (
                            <div className="mt-2">
                              <p className="text-[10px] text-orange-600 mb-0.5">需改进的</p>
                              <p className="text-xs text-gray-600">{detail.what_to_improve as string}</p>
                            </div>
                          )}
                          {(detail.next_actions as string) && (
                            <div className="mt-2">
                              <p className="text-[10px] text-brand-600 mb-0.5">下一步</p>
                              <p className="text-xs text-gray-600">{detail.next_actions as string}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {detail && log.type === 'dependency_risk' && (
                        <div className="p-3 bg-orange-50 rounded-lg">
                          <p className="text-[10px] text-orange-400 mb-1 uppercase tracking-wide">关联依赖</p>
                          <div className="space-y-1">
                            {(detail.dependent_okr_title as string) && (
                              <p className="text-xs text-gray-600">依赖方: <span className="font-medium">{detail.dependent_okr_title as string}</span></p>
                            )}
                            {(detail.depended_okr_title as string) && (
                              <p className="text-xs text-gray-600">被依赖方: <span className="font-medium">{detail.depended_okr_title as string}</span></p>
                            )}
                            {(detail.dependency_status as string) && (
                              <p className="text-xs text-gray-600">当前状态: <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${(detail.dependency_status as string) === 'healthy' ? 'bg-green-100 text-green-700' : (detail.dependency_status as string) === 'at_risk' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                                {(detail.dependency_status as string) === 'healthy' ? '健康' : (detail.dependency_status as string) === 'at_risk' ? '有风险' : '高危'}
                              </span></p>
                            )}
                          </div>
                        </div>
                      )}

                      {detail && log.type === 'status_change' && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide">OKR信息</p>
                          <p className="text-sm font-medium text-gray-700">{detail.okr_title as string}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            级别: {detail.okr_level === 'company' ? '公司级' : detail.okr_level === 'department' ? '部门级' : '个人级'}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                };

                return (
                  <div key={log.id} className="flex gap-3 relative">
                    <div className="flex flex-col items-center z-10">
                      <div className={`w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div className="w-0.5 flex-1 bg-gray-100" />
                    </div>
                    <div className="flex-1 pb-4">
                      <button
                        onClick={() => toggleLogExpand(log.id)}
                        className="w-full text-left p-2 -ml-2 rounded-lg hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${config.bgColor} ${config.color}`}>{config.label}</span>
                            <span className="text-xs text-gray-500">{log.actor_name || '未知'}</span>
                            <span className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString('zh-CN')}</span>
                          </div>
                          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{log.description}</p>
                        {(log.old_value || log.new_value) && !isExpanded && (
                          <div className="flex items-center gap-2 mt-1.5 text-xs">
                            {log.old_value && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded">{log.old_value}</span>}
                            {log.old_value && log.new_value && <ChevronRight className="w-3 h-3 text-gray-300" />}
                            {log.new_value && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded font-medium">{log.new_value}</span>}
                          </div>
                        )}
                      </button>

                      {isExpanded && renderAuditDetail()}
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
