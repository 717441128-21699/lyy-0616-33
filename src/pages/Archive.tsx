import { useState, useEffect } from 'react';
import { Archive as ArchiveIcon, Eye, Inbox, Download, FileText } from 'lucide-react';
import type { OKR, OKRWithDetails, Review as ReviewType } from '@/types';
import { fetchArchivedOkrs, fetchOkrById, fetchReviewsByOkr, fetchQuarterlyReport } from '@/api';
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
  const [quarter, setQuarter] = useState('Q2');
  const [year, setYear] = useState(2026);
  const [okrs, setOkrs] = useState<OKR[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<OKRWithDetails | null>(null);
  const [selectedReview, setSelectedReview] = useState<ReviewType | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  const handleExport = async () => {
    setExporting(true);
    try {
      const report = await fetchQuarterlyReport(quarter, year);
      const reportText = generateReportText(report);
      const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${year}年${quarter}季度复盘报告.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const generateReportText = (report: any): string => {
    let text = '';
    text += '═══════════════════════════════════════════════\n';
    text += `     ${report.year}年 ${report.quarter} 季度 OKR 复盘报告\n`;
    text += '═══════════════════════════════════════════════\n\n';
    text += `生成时间: ${new Date(report.generated_at).toLocaleString('zh-CN')}\n\n`;

    text += '───────────────────────────────────────────────\n';
    text += '  一、整体概览\n';
    text += '───────────────────────────────────────────────\n\n';
    text += `  OKR总数:        ${report.summary.total_okrs} 个\n`;
    text += `  已完成OKR:      ${report.summary.completed_okrs} 个\n`;
    text += `  OKR平均进度:    ${report.summary.avg_okr_progress.toFixed(1)}%\n`;
    text += `  KR总数:         ${report.summary.total_krs} 个\n`;
    text += `  已完成KR:       ${report.summary.completed_krs} 个\n`;
    text += `  风险依赖数:     ${report.summary.at_risk_dependencies} 个\n\n`;

    text += '───────────────────────────────────────────────\n';
    text += '  二、OKR详细情况\n';
    text += '───────────────────────────────────────────────\n\n';

    report.okrs.forEach((okr: any, idx: number) => {
      text += `  ${idx + 1}. ${okr.title}\n`;
      text += `     负责人: ${okr.owner_name || '未指定'} | 级别: ${okr.level === 'company' ? '公司级' : okr.level === 'department' ? '部门级' : '个人级'}\n`;
      text += `     整体进度: ${okr.overall_progress.toFixed(1)}%  |  KR完成: ${okr.kr_completed_count}/${okr.kr_total_count}\n\n`;

      if (okr.key_results.length > 0) {
        text += `     关键结果:\n`;
        okr.key_results.forEach((kr: any) => {
          const status = kr.completed ? '✓ 完成' : '○ 进行中';
          text += `       ${status}  ${kr.title}\n`;
          text += `           当前: ${kr.current_value}/${kr.target_value}${kr.unit}  (${kr.progress.toFixed(1)}%)\n`;
        });
        text += '\n';
      }

      if (okr.reviews.length > 0) {
        text += `     复盘评分:\n`;
        okr.reviews.forEach((review: any) => {
          text += `       综合评分: ${review.overall_score.toFixed(1)}  |  复盘人: ${review.reviewer_name || '未指定'}\n`;
          if (review.what_went_well) text += `       做得好的: ${review.what_went_well}\n`;
          if (review.what_to_improve) text += `       需改进的: ${review.what_to_improve}\n`;
          if (review.next_actions) text += `       下一步: ${review.next_actions}\n`;
        });
        text += '\n';
      }

      if (okr.dependencies.length > 0) {
        text += `     依赖关系:\n`;
        okr.dependencies.forEach((dep: any) => {
          const statusText = dep.status === 'healthy' ? '健康' : dep.status === 'at_risk' ? '有风险' : '高危';
          text += `       [${statusText}] ${dep.type}: ${dep.other_okr_title || '未知'}\n`;
        });
        text += '\n';
      }

      text += '  ─────────────────────────────────────────────\n\n';
    });

    text += '═══════════════════════════════════════════════\n';
    text += '                   报告结束\n';
    text += '═══════════════════════════════════════════════\n';

    return text;
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
          <button
            onClick={handleExport}
            disabled={exporting || okrs.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {exporting ? '生成中...' : '导出报告'}
          </button>
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
