import { useState, useEffect, useMemo } from 'react';
import { Archive as ArchiveIcon, Eye, Inbox, Download, FileText, ChevronDown, ChevronRight, Users, Target, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { OKR, OKRWithDetails, Review as ReviewType, KeyResult, Dependency } from '@/types';
import { fetchArchivedOkrs, fetchOkrById, fetchReviewsByOkr, fetchQuarterlyReport, type QuarterlyReport } from '@/api';
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<QuarterlyReport | null>(null);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set(['all']));
  const [expandedOkrs, setExpandedOkrs] = useState<Set<string>>(new Set());

  type ReportOkr = QuarterlyReport['okrs'][number];

  const groupedByDepartment = useMemo(() => {
    if (!previewData) return [];
    const groups: { id: string; name: string; okrs: ReportOkr[] }[] = [];
    const deptMap = new Map<string, ReportOkr[]>();

    previewData.okrs.forEach((okr: ReportOkr) => {
      const deptId = okr.department_id || 'no_dept';
      if (!deptMap.has(deptId)) {
        deptMap.set(deptId, []);
      }
      deptMap.get(deptId)!.push(okr);
    });

    deptMap.forEach((okrs, deptId) => {
      const name = okrs[0]?.department_name || '未分配部门';
      groups.push({ id: deptId, name, okrs });
    });

    groups.sort((a, b) => {
      if (a.id === 'no_dept') return 1;
      if (b.id === 'no_dept') return -1;
      return a.name.localeCompare(b.name);
    });

    return groups;
  }, [previewData]);

  const toggleDeptExpand = (deptId: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) next.delete(deptId);
      else next.add(deptId);
      return next;
    });
  };

  const toggleOkrExpand = (okrId: string) => {
    setExpandedOkrs((prev) => {
      const next = new Set(prev);
      if (next.has(okrId)) next.delete(okrId);
      else next.add(okrId);
      return next;
    });
  };

  const expandAllDepts = () => {
    setExpandedDepts(new Set(groupedByDepartment.map((g) => g.id).concat(['all'])));
  };

  const collapseAllDepts = () => {
    setExpandedDepts(new Set());
  };

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

  const handlePreview = async () => {
    setPreviewLoading(true);
    setPreviewOpen(true);
    try {
      const report = await fetchQuarterlyReport(quarter, year);
      setPreviewData(report);
    } catch {
      setPreviewData(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const report = previewData || await fetchQuarterlyReport(quarter, year);
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

  const generateReportText = (report: QuarterlyReport): string => {
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

    report.okrs.forEach((okr: ReportOkr, idx: number) => {
      text += `  ${idx + 1}. ${okr.title}\n`;
      text += `     负责人: ${okr.owner_name || '未指定'} | 级别: ${okr.level === 'company' ? '公司级' : okr.level === 'department' ? '部门级' : '个人级'}\n`;
      text += `     整体进度: ${okr.overall_progress.toFixed(1)}%  |  KR完成: ${okr.kr_completed_count}/${okr.kr_total_count}\n\n`;

      if (okr.key_results.length > 0) {
        text += `     关键结果:\n`;
        okr.key_results.forEach((kr) => {
          const status = kr.completed ? '✓ 完成' : '○ 进行中';
          text += `       ${status}  ${kr.title}\n`;
          text += `           当前: ${kr.current_value}/${kr.target_value}${kr.unit}  (${kr.progress.toFixed(1)}%)\n`;
        });
        text += '\n';
      }

      if (okr.reviews.length > 0) {
        text += `     复盘评分:\n`;
        okr.reviews.forEach((review) => {
          text += `       综合评分: ${review.overall_score.toFixed(1)}  |  复盘人: ${review.reviewer_name || '未指定'}\n`;
          if (review.what_went_well) text += `       做得好的: ${review.what_went_well}\n`;
          if (review.what_to_improve) text += `       需改进的: ${review.what_to_improve}\n`;
          if (review.next_actions) text += `       下一步: ${review.next_actions}\n`;
        });
        text += '\n';
      }

      if (okr.dependencies.length > 0) {
        text += `     依赖关系:\n`;
        okr.dependencies.forEach((dep) => {
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
            onClick={handlePreview}
            disabled={previewLoading || okrs.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" />
            {previewLoading ? '加载中...' : '预览报告'}
          </button>
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

      <Modal isOpen={previewOpen} onClose={() => setPreviewOpen(false)} title={`${year}年${quarter}季度复盘报告预览`} width="max-w-4xl">
        {previewLoading ? (
          <div className="py-16 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm text-gray-500">正在加载报告数据...</p>
          </div>
        ) : !previewData ? (
          <div className="py-16 text-center">
            <AlertTriangle className="w-12 h-12 text-orange-400 mx-auto mb-3" />
            <p className="text-sm text-gray-500">报告数据加载失败，请重试</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-brand-50 to-purple-50 rounded-xl p-6 border border-brand-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-display font-bold text-gray-900">{previewData.year}年 {previewData.quarter} 季度 OKR 复盘报告</h3>
                  <p className="text-sm text-gray-500 mt-1">生成时间: {new Date(previewData.generated_at).toLocaleString('zh-CN')}</p>
                </div>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  {exporting ? '生成中...' : '下载报告'}
                </button>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                  <div className="text-2xl font-bold text-gray-900">{previewData.summary.total_okrs}</div>
                  <div className="text-xs text-gray-500 mt-0.5">OKR总数</div>
                </div>
                <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                  <div className="text-2xl font-bold text-green-600">{previewData.summary.completed_okrs}</div>
                  <div className="text-xs text-gray-500 mt-0.5">已完成OKR</div>
                </div>
                <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                  <div className="text-2xl font-bold text-brand-600">{previewData.summary.avg_okr_progress.toFixed(1)}%</div>
                  <div className="text-xs text-gray-500 mt-0.5">平均进度</div>
                </div>
                <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                  <div className="text-2xl font-bold text-gray-900">{previewData.summary.total_krs}</div>
                  <div className="text-xs text-gray-500 mt-0.5">KR总数</div>
                </div>
                <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                  <div className="text-2xl font-bold text-green-600">{previewData.summary.completed_krs}</div>
                  <div className="text-xs text-gray-500 mt-0.5">已完成KR</div>
                </div>
                <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                  <div className="text-2xl font-bold text-red-600">{previewData.summary.at_risk_dependencies}</div>
                  <div className="text-xs text-gray-500 mt-0.5">风险依赖</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-600" />按部门查看
              </h4>
              <div className="flex items-center gap-2">
                <button onClick={expandAllDepts} className="text-xs text-brand-600 hover:text-brand-800 transition-colors">全部展开</button>
                <span className="text-gray-200">|</span>
                <button onClick={collapseAllDepts} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">全部收起</button>
              </div>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {groupedByDepartment.map((dept) => {
                const deptProgress = dept.okrs.reduce((acc, o) => acc + o.overall_progress, 0) / dept.okrs.length;
                const isExpanded = expandedDepts.has(dept.id);
                return (
                  <div key={dept.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                    <div
                      onClick={() => toggleDeptExpand(dept.id)}
                      className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800">{dept.name}</span>
                          <span className="text-xs text-gray-400">{dept.okrs.length} 个OKR</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="w-20">
                          <ProgressBar progress={deptProgress} height={6} />
                        </div>
                        <span className="text-xs font-medium text-gray-600 w-12 text-right">{deptProgress.toFixed(1)}%</span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-gray-100 divide-y divide-gray-100">
                        {dept.okrs.map((okr) => {
                          const okrExpanded = expandedOkrs.has(okr.okr_id);
                          return (
                            <div key={okr.okr_id} className="p-4 pl-11">
                              <div
                                onClick={() => toggleOkrExpand(okr.okr_id)}
                                className="flex items-start gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                              >
                                {okrExpanded ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Target className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                                    <p className="text-sm font-medium text-gray-800 truncate">{okr.title}</p>
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${levelBadge(okr.level)}`}>{levelLabel(okr.level)}</span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1.5">
                                    <span className="text-xs text-gray-500">{okr.owner_name}</span>
                                    <span className="text-xs text-gray-400">KR {okr.kr_completed_count}/{okr.kr_total_count}</span>
                                    <div className="flex items-center gap-1 ml-auto">
                                      <div className="w-16">
                                        <ProgressBar progress={okr.overall_progress} height={4} />
                                      </div>
                                      <span className="text-xs font-medium text-gray-600 w-10 text-right">{okr.overall_progress.toFixed(1)}%</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {okrExpanded && (
                                <div className="ml-7 mt-3 space-y-3">
                                  <div className="bg-gray-50 rounded-lg p-3">
                                    <h5 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />关键结果
                                    </h5>
                                    <div className="space-y-1.5">
                                      {okr.key_results.map((kr) => (
                                        <div key={kr.id} className="flex items-center gap-2 text-xs">
                                          <span className={kr.completed ? 'text-green-600' : 'text-gray-400'}>
                                            {kr.completed ? '✓' : '○'}
                                          </span>
                                          <span className="flex-1 text-gray-700">{kr.title}</span>
                                          <span className="text-gray-500">{kr.current_value}/{kr.target_value}{kr.unit}</span>
                                          <span className="text-gray-400 w-12 text-right">{kr.progress.toFixed(1)}%</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  {okr.reviews.length > 0 && (
                                    <div className="bg-orange-50 rounded-lg p-3">
                                      <h5 className="text-xs font-semibold text-orange-800 mb-2 flex items-center gap-1.5">
                                        <ArchiveIcon className="w-3.5 h-3.5 text-orange-500" />复盘总结
                                      </h5>
                                      {okr.reviews.map((review, idx) => (
                                        <div key={idx} className="space-y-1.5">
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs text-orange-700">评分人: {review.reviewer_name || '未指定'}</span>
                                            <span className="text-xs font-bold text-orange-800">综合评分: {review.overall_score.toFixed(1)}</span>
                                          </div>
                                          {review.what_went_well && (
                                            <p className="text-xs text-gray-700"><span className="font-medium text-green-700">做得好：</span>{review.what_went_well}</p>
                                          )}
                                          {review.what_to_improve && (
                                            <p className="text-xs text-gray-700"><span className="font-medium text-orange-700">待改进：</span>{review.what_to_improve}</p>
                                          )}
                                          {review.next_actions && (
                                            <p className="text-xs text-gray-700"><span className="font-medium text-brand-700">下一步：</span>{review.next_actions}</p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {okr.dependencies.length > 0 && (
                                    <div className="bg-red-50 rounded-lg p-3">
                                      <h5 className="text-xs font-semibold text-red-800 mb-2 flex items-center gap-1.5">
                                        <ShieldAlert className="w-3.5 h-3.5 text-red-500" />依赖风险
                                      </h5>
                                      <div className="space-y-1.5">
                                        {okr.dependencies.map((dep, idx) => {
                                          const statusText = dep.status === 'healthy' ? '健康' : dep.status === 'at_risk' ? '有风险' : '高危';
                                          const statusColor = dep.status === 'healthy' ? 'bg-green-100 text-green-700' : dep.status === 'at_risk' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700';
                                          return (
                                            <div key={idx} className="flex items-center gap-2 text-xs">
                                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColor}`}>{statusText}</span>
                                              <span className="text-gray-600">{dep.type}:</span>
                                              <span className="text-gray-800">{dep.other_okr_title || '未知'}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
