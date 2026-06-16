import { useState, useEffect } from 'react';
import { Send, TrendingUp, Calendar } from 'lucide-react';
import type { OKR, OKRWithDetails, WeeklyUpdate as WeeklyUpdateType } from '@/types';
import { fetchOkrs, fetchOkrById, fetchWeeklyUpdates, createWeeklyUpdate } from '@/api';
import ProgressBar from '@/components/ProgressBar';

function getWeekNumber(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - start.getTime();
  return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
}

function confidenceColor(v: number): string {
  if (v <= 3) return 'text-red-500';
  if (v <= 6) return 'text-orange-500';
  return 'text-green-500';
}

function confidenceBg(v: number): string {
  if (v <= 3) return 'bg-red-500';
  if (v <= 6) return 'bg-orange-500';
  return 'bg-green-500';
}

export default function WeeklyUpdate() {
  const [okrs, setOkrs] = useState<OKR[]>([]);
  const [selectedOkrId, setSelectedOkrId] = useState('');
  const [okrDetail, setOkrDetail] = useState<OKRWithDetails | null>(null);
  const [selectedKrId, setSelectedKrId] = useState('');
  const [description, setDescription] = useState('');
  const [confidence, setConfidence] = useState(5);
  const [krValue, setKrValue] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [updates, setUpdates] = useState<WeeklyUpdateType[]>([]);
  const [filterOkrId, setFilterOkrId] = useState('');

  const weekNumber = getWeekNumber(new Date());
  const year = new Date().getFullYear();

  useEffect(() => {
    fetchOkrs({ status: 'active' }).then(setOkrs);
    fetchWeeklyUpdates().then((data) => setUpdates(data.sort((a, b) => b.created_at.localeCompare(a.created_at))));
  }, []);

  useEffect(() => {
    if (selectedOkrId) {
      fetchOkrById(selectedOkrId).then(setOkrDetail);
      setSelectedKrId('');
      setKrValue('');
    } else {
      setOkrDetail(null);
    }
  }, [selectedOkrId]);

  const handleSubmit = async () => {
    if (!selectedOkrId || !selectedKrId || !description) return;
    setSubmitting(true);
    try {
      await createWeeklyUpdate({
        okr_id: selectedOkrId,
        kr_id: selectedKrId,
        week_number: weekNumber,
        year,
        progress_description: description,
        confidence_index: confidence,
        kr_current_value: Number(krValue),
        updated_by: 'user-4',
      });
      setSuccess(true);
      setSelectedOkrId('');
      setSelectedKrId('');
      setDescription('');
      setConfidence(5);
      setKrValue('');
      const refreshed = await fetchWeeklyUpdates();
      setUpdates(refreshed.sort((a, b) => b.created_at.localeCompare(a.created_at)));
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUpdates = filterOkrId ? updates.filter((u) => u.okr_id === filterOkrId) : updates;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold text-gray-900">周报更新</h2>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl shadow-sm p-6 space-y-5">
          <h3 className="text-lg font-display font-semibold text-gray-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand-600" />
            提交周报
            <span className="ml-auto text-sm text-gray-400">第{weekNumber}周 / {year}年</span>
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">选择OKR</label>
            <select value={selectedOkrId} onChange={(e) => setSelectedOkrId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none">
              <option value="">-- 请选择 --</option>
              {okrs.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          </div>
          {okrDetail && okrDetail.key_results.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">选择关键结果</label>
              <div className="space-y-2">
                {okrDetail.key_results.map((kr) => (
                  <label key={kr.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedKrId === kr.id ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="kr" value={kr.id} checked={selectedKrId === kr.id} onChange={() => { setSelectedKrId(kr.id); setKrValue(kr.current_value); }} className="text-brand-600 focus:ring-brand-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{kr.title}</p>
                      <ProgressBar progress={kr.progress} height={4} showLabel={false} />
                    </div>
                    <span className="text-xs text-gray-500">{kr.current_value}/{kr.target_value}{kr.unit}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">本周进展描述</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none" placeholder="请描述本周进展..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">信心指数</label>
            <div className="flex items-center gap-4">
              <input type="range" min={1} max={10} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} className="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-brand-600" />
              <span className={`text-3xl font-bold ${confidenceColor(confidence)}`}>{confidence}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1 低</span><span>5 中</span><span>10 高</span>
            </div>
            <div className="mt-2 flex gap-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                <div key={v} className={`h-2 flex-1 rounded-full ${v <= confidence ? confidenceBg(confidence) : 'bg-gray-200'} transition-colors`} />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">KR当前值</label>
            <input type="number" value={krValue} onChange={(e) => setKrValue(e.target.value ? Number(e.target.value) : '')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" placeholder="输入当前值" />
          </div>
          {success && <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg">周报提交成功！</div>}
          <button onClick={handleSubmit} disabled={!selectedOkrId || !selectedKrId || !description || submitting} className="w-full bg-brand-800 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
            <Send className="w-4 h-4" />
            {submitting ? '提交中...' : '提交周报'}
          </button>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h3 className="text-lg font-display font-semibold text-gray-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent-500" />历史更新
          </h3>
          <select value={filterOkrId} onChange={(e) => setFilterOkrId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none">
            <option value="">全部OKR</option>
            {okrs.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
          </select>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {filteredUpdates.map((u) => (
              <div key={u.id} className="border border-gray-100 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">第{u.week_number}周</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${confidenceColor(u.confidence_index)} bg-opacity-10`} style={{ backgroundColor: u.confidence_index <= 3 ? '#fef2f2' : u.confidence_index <= 6 ? '#fff7ed' : '#f0fdf4' }}>
                    信心 {u.confidence_index}
                  </span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-2">{u.progress_description}</p>
                <p className="text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString('zh-CN')}</p>
              </div>
            ))}
            {filteredUpdates.length === 0 && <p className="text-sm text-gray-400 text-center py-8">暂无更新记录</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
