import { useState, useEffect, useCallback } from 'react';
import { Star, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import type { OKR, OKRWithDetails, Review as ReviewType } from '@/types';
import { fetchOkrs, fetchOkrById, fetchReviewsByOkr, createReview } from '@/api';
import ProgressBar from '@/components/ProgressBar';
import ProgressRing from '@/components/ProgressRing';

function scoreColor(s: number): string {
  if (s >= 0.7) return 'bg-green-100 text-green-700';
  if (s >= 0.3) return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-700';
}

function overallColor(s: number): string {
  if (s >= 0.7) return 'text-green-600';
  if (s >= 0.3) return 'text-orange-500';
  return 'text-red-500';
}

function levelBadge(level: string): string {
  if (level === 'company') return 'bg-brand-100 text-brand-700';
  if (level === 'department') return 'bg-purple-100 text-purple-700';
  return 'bg-gray-100 text-gray-700';
}

interface ReviewState {
  expanded: boolean;
  existing: ReviewType | null;
  loading: boolean;
  krScores: Record<string, number>;
  wentWell: string;
  toImprove: string;
  nextActions: string;
  submitting: boolean;
}

export default function Review() {
  const [quarter, setQuarter] = useState('Q2');
  const [year, setYear] = useState(2026);
  const [okrs, setOkrs] = useState<OKR[]>([]);
  const [okrDetails, setOkrDetails] = useState<Record<string, OKRWithDetails>>({});
  const [reviewStates, setReviewStates] = useState<Record<string, ReviewState>>({});

  const loadOkrs = useCallback(() => {
    fetchOkrs({ quarter, year: String(year) }).then(setOkrs);
  }, [quarter, year]);

  useEffect(() => { loadOkrs(); }, [loadOkrs]);

  const toggleExpand = async (okrId: string) => {
    const current = reviewStates[okrId];
    if (current?.expanded) {
      setReviewStates((prev) => ({ ...prev, [okrId]: { ...prev[okrId], expanded: false } }));
      return;
    }
    if (current?.existing) {
      setReviewStates((prev) => ({ ...prev, [okrId]: { ...prev[okrId], expanded: true } }));
      return;
    }
    setReviewStates((prev) => ({ ...prev, [okrId]: { expanded: true, existing: null, loading: true, krScores: {}, wentWell: '', toImprove: '', nextActions: '', submitting: false } }));
    try {
      const [detail, reviews] = await Promise.all([fetchOkrById(okrId), fetchReviewsByOkr(okrId)]);
      const initialScores: Record<string, number> = {};
      detail.key_results.forEach((kr) => { initialScores[kr.id] = 0.5; });
      const existing = reviews.length > 0 ? reviews[0] : null;
      if (existing) {
        existing.kr_scores.forEach((ks) => { initialScores[ks.kr_id] = ks.score; });
      }
      setOkrDetails((prev) => ({ ...prev, [okrId]: detail }));
      setReviewStates((prev) => ({
        ...prev,
        [okrId]: { expanded: true, existing, loading: false, krScores: initialScores, wentWell: existing?.what_went_well || '', toImprove: existing?.what_to_improve || '', nextActions: existing?.next_actions || '', submitting: false },
      }));
    } catch {
      setReviewStates((prev) => ({ ...prev, [okrId]: { ...prev[okrId], loading: false } }));
    }
  };

  const handleSubmit = async (okrId: string) => {
    const st = reviewStates[okrId];
    if (!st || !okrDetails[okrId]) return;
    setReviewStates((prev) => ({ ...prev, [okrId]: { ...prev[okrId], submitting: true } }));
    const detail = okrDetails[okrId];
    const krScores = detail.key_results.map((kr) => ({ kr_id: kr.id, score: st.krScores[kr.id] ?? 0.5 }));
    const overallScore = krScores.reduce((sum, ks) => sum + ks.score, 0) / krScores.length;
    try {
      const review = await createReview({ okr_id: okrId, quarter, year, overall_score: overallScore, what_went_well: st.wentWell, what_to_improve: st.toImprove, next_actions: st.nextActions, reviewed_by: 'user-4', kr_scores: krScores });
      setReviewStates((prev) => ({ ...prev, [okrId]: { ...prev[okrId], existing: review, submitting: false } }));
    } catch {
      setReviewStates((prev) => ({ ...prev, [okrId]: { ...prev[okrId], submitting: false } }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold text-gray-900">复盘评分</h2>
        <div className="flex items-center gap-3">
          <select value={quarter} onChange={(e) => setQuarter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none">
            {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none">
            {[2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-4">
        {okrs.map((okr) => {
          const st = reviewStates[okr.id];
          const detail = okrDetails[okr.id];
          return (
            <div key={okr.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 flex items-center gap-4 cursor-pointer" onClick={() => toggleExpand(okr.id)}>
                <ProgressRing progress={okr.overall_progress} size={48} strokeWidth={4} />
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-gray-800 truncate">{okr.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{okr.owner_name}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${levelBadge(okr.level)}`}>{okr.level === 'company' ? '公司' : okr.level === 'department' ? '部门' : '个人'}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${okr.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{okr.status}</span>
                  </div>
                </div>
                {st?.existing && <span className={`text-lg font-bold ${overallColor(st.existing.overall_score)}`}>{st.existing.overall_score.toFixed(1)}</span>}
                {st?.expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </div>
              {st?.expanded && !st.loading && detail && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                  {st.existing ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-green-600"><CheckCircle className="w-5 h-5" /><span className="font-medium">已复盘</span><span className={`text-xl font-bold ml-2 ${overallColor(st.existing.overall_score)}`}>{st.existing.overall_score.toFixed(1)}分</span></div>
                      {detail.key_results.map((kr) => {
                        const ks = st.existing!.kr_scores.find((s) => s.kr_id === kr.id);
                        return (
                          <div key={kr.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <span className="flex-1 text-sm text-gray-700">{kr.title}</span>
                            <span className="text-xs text-gray-500">{kr.current_value}/{kr.target_value}</span>
                            <div className="w-20"><ProgressBar progress={kr.progress} height={4} showLabel={false} /></div>
                            {ks && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreColor(ks.score)}`}>{ks.score.toFixed(1)}</span>}
                          </div>
                        );
                      })}
                      <div className="grid grid-cols-3 gap-3 pt-2">
                        <div className="bg-green-50 rounded-lg p-3"><p className="text-xs font-medium text-green-700 mb-1">做得好的</p><p className="text-sm text-gray-700">{st.existing.what_went_well}</p></div>
                        <div className="bg-orange-50 rounded-lg p-3"><p className="text-xs font-medium text-orange-700 mb-1">需改进的</p><p className="text-sm text-gray-700">{st.existing.what_to_improve}</p></div>
                        <div className="bg-brand-50 rounded-lg p-3"><p className="text-xs font-medium text-brand-700 mb-1">下一步行动</p><p className="text-sm text-gray-700">{st.existing.next_actions}</p></div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {detail.key_results.map((kr) => (
                        <div key={kr.id} className="p-3 bg-gray-50 rounded-lg space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="flex-1 text-sm font-medium text-gray-700">{kr.title}</span>
                            <span className="text-xs text-gray-500">{kr.current_value}/{kr.target_value}</span>
                            <div className="w-20"><ProgressBar progress={kr.progress} height={4} showLabel={false} /></div>
                            <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${scoreColor(st.krScores[kr.id] ?? 0.5)}`}>{(st.krScores[kr.id] ?? 0.5).toFixed(1)}</span>
                          </div>
                          <input type="range" min={0} max={10} value={Math.round((st.krScores[kr.id] ?? 0.5) * 10)} onChange={(e) => setReviewStates((prev) => ({ ...prev, [okr.id]: { ...prev[okr.id], krScores: { ...prev[okr.id].krScores, [kr.id]: Number(e.target.value) / 10 } } }))} className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-brand-600" />
                        </div>
                      ))}
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">做得好的</label><textarea value={st.wentWell} onChange={(e) => setReviewStates((prev) => ({ ...prev, [okr.id]: { ...prev[okr.id], wentWell: e.target.value } }))} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none" /></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">需改进的</label><textarea value={st.toImprove} onChange={(e) => setReviewStates((prev) => ({ ...prev, [okr.id]: { ...prev[okr.id], toImprove: e.target.value } }))} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none" /></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">下一步行动</label><textarea value={st.nextActions} onChange={(e) => setReviewStates((prev) => ({ ...prev, [okr.id]: { ...prev[okr.id], nextActions: e.target.value } }))} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none" /></div>
                      <button onClick={() => handleSubmit(okr.id)} disabled={st.submitting} className="bg-brand-800 text-white px-6 py-2 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                        <Star className="w-4 h-4" />{st.submitting ? '提交中...' : '提交复盘'}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {st?.expanded && st.loading && <div className="px-5 pb-5 text-center text-gray-400 text-sm py-8">加载中...</div>}
            </div>
          );
        })}
        {okrs.length === 0 && <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">该季度暂无OKR</div>}
      </div>
    </div>
  );
}
