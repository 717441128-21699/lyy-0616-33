import { useState, useEffect } from 'react';
import { Archive as ArchiveIcon, Eye, Inbox } from 'lucide-react';
import type { OKR, OKRWithDetails, Review as ReviewType } from '@/types';
import { fetchArchivedOkrs, fetchOkrById, fetchReviewsByOkr } from '@/api';
import ProgressBar from '@/components/ProgressBar';
import ProgressRing from '@/components/ProgressRing';
import Modal from '@/components/Modal';

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

export default function Archive() {
  const [quarter, setQuarter] = useState('Q1');
  const [year, setYear] = useState(2025);
  const [okrs, setOkrs] = useState<OKR[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<OKRWithDetails | null>(null);
  const [selectedReview, setSelectedReview] = useState<ReviewType | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchArchivedOkrs({ quarter, year: String(year) }).then(setOkrs);
  }, [quarter, year]);

  const openDetail = async (okrId: string) => {
    try {
      const [detail, reviews] = await Promise.all([fetchOkrById(okrId), fetchReviewsByOkr(okrId)]);
      setSelectedDetail(detail);
      setSelectedReview(reviews.length > 0 ? reviews[0] : null);
      setModalOpen(true);
    } catch { /* empty */ }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold text-gray-900">历史归档</h2>
        <div className="flex items-center gap-3">
          <select value={quarter} onChange={(e) => setQuarter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none">
            {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none">
            {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {okrs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-16 text-center">
          <Inbox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-500">暂无归档数据</p>
          <p className="text-sm text-gray-400 mt-1">该季度没有已归档的OKR</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {okrs.map((okr) => (
            <div key={okr.id} className="bg-white rounded-xl shadow-sm p-5 flex items-start gap-4">
              <ProgressRing progress={okr.overall_progress} size={52} strokeWidth={4} />
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-gray-800 truncate">{okr.title}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-gray-500">{okr.owner_name}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${levelBadge(okr.level)}`}>{levelLabel(okr.level)}</span>
                  <span className="text-xs text-gray-400">{okr.quarter} {okr.year}</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">已归档</span>
                </div>
                <div className="mt-3">
                  <ProgressBar progress={okr.overall_progress} height={6} />
                </div>
              </div>
              <button onClick={() => openDetail(okr.id)} className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors flex-shrink-0">
                <Eye className="w-4 h-4" />查看详情
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="归档详情" width="max-w-2xl">
        {selectedDetail && (
          <div className="space-y-5">
            <div>
              <h3 className="font-display font-semibold text-gray-800 text-lg">{selectedDetail.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{selectedDetail.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500">{selectedDetail.owner_name}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${levelBadge(selectedDetail.level)}`}>{levelLabel(selectedDetail.level)}</span>
                <span className="text-xs text-gray-400">{selectedDetail.quarter} {selectedDetail.year}</span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">关键结果</h4>
              <div className="space-y-2">
                {selectedDetail.key_results.map((kr) => (
                  <div key={kr.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="flex-1 text-sm text-gray-700">{kr.title}</span>
                    <span className="text-xs text-gray-500">{kr.current_value}/{kr.target_value}{kr.unit}</span>
                    <div className="w-24"><ProgressBar progress={kr.progress} height={4} /></div>
                  </div>
                ))}
              </div>
            </div>
            {selectedReview && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <ArchiveIcon className="w-4 h-4 text-accent-500" />复盘总结
                </h4>
                <div className="space-y-2">
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-green-700 mb-1">做得好的</p>
                    <p className="text-sm text-gray-700">{selectedReview.what_went_well}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-orange-700 mb-1">需改进的</p>
                    <p className="text-sm text-gray-700">{selectedReview.what_to_improve}</p>
                  </div>
                  <div className="bg-brand-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-brand-700 mb-1">下一步行动</p>
                    <p className="text-sm text-gray-700">{selectedReview.next_actions}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-500">综合评分: </span>
                    <span className={`text-lg font-bold ${selectedReview.overall_score >= 0.7 ? 'text-green-600' : selectedReview.overall_score >= 0.3 ? 'text-orange-500' : 'text-red-500'}`}>
                      {selectedReview.overall_score.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
