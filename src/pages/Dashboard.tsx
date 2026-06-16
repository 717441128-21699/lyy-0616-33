import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Target, TrendingUp, AlertTriangle, Clock, ChevronRight } from 'lucide-react';
import { fetchOkrs, fetchAlignmentTree, fetchPendingUpdates, fetchDependencies, fetchNotifications, markNotificationRead } from '@/api';
import type { TreeNode, PendingUpdate, Notification, OKR, Dependency } from '@/types';
import StatCard from '@/components/StatCard';
import ProgressRing from '@/components/ProgressRing';

const LEVEL_BADGE: Record<string, string> = {
  company: 'bg-blue-100 text-blue-700',
  department: 'bg-purple-100 text-purple-700',
  individual: 'bg-teal-100 text-teal-700',
};
const LEVEL_LABEL: Record<string, string> = { company: '公司', department: '部门', individual: '个人' };

function TreeItem({ node }: { node: TreeNode }) {
  return (
    <div className="relative">
      <Link
        to={`/okrs/${node.id}`}
        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
      >
        <ProgressRing progress={node.overall_progress} size={48} strokeWidth={4} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate group-hover:text-brand-600">{node.title}</p>
          <p className="text-xs text-gray-500">{node.owner_name || '未指定'}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEVEL_BADGE[node.level]}`}>
          {LEVEL_LABEL[node.level]}
        </span>
      </Link>
      {node.children.length > 0 && (
        <div className="ml-8 border-l-2 border-brand-100 pl-4 space-y-1">
          {node.children.map((child) => (
            <TreeItem key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [okrs, setOkrs] = useState<OKR[]>([]);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [pending, setPending] = useState<PendingUpdate[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [riskCount, setRiskCount] = useState(0);

  useEffect(() => {
    fetchOkrs().then(setOkrs);
    fetchAlignmentTree().then(setTree);
    fetchPendingUpdates().then(setPending);
    fetchDependencies().then((deps: Dependency[]) => {
      setRiskCount(deps.filter((d) => d.status === 'at_risk' || d.status === 'critical').length);
    });
    fetchNotifications().then(setNotifications);
  }, []);

  const avgProgress = okrs.length
    ? Math.round(okrs.reduce((s, o) => s + o.overall_progress, 0) / okrs.length)
    : 0;
  const unread = notifications.filter((n) => !n.is_read);

  const handleMarkRead = async (nid: string) => {
    await markNotificationRead(nid);
    setNotifications((prev) => prev.map((n) => (n.id === nid ? { ...n, is_read: true } : n)));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="OKR总数" value={okrs.length} icon={<Target className="w-5 h-5" />} color="#1e3a5f" />
        <StatCard
          title="平均进度"
          value={`${avgProgress}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="#10b981"
          trend={avgProgress > 50 ? '+5%' : '-2%'}
        />
        <StatCard title="风险项数" value={riskCount} icon={<AlertTriangle className="w-5 h-5" />} color="#ef4444" />
        <StatCard title="待更新数" value={pending.length} icon={<Clock className="w-5 h-5" />} color="#f59e0b" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-display font-semibold text-gray-900 mb-4">对齐树</h3>
          {tree.length === 0 ? (
            <p className="text-gray-400 text-sm py-8 text-center">暂无对齐树数据</p>
          ) : (
            <div className="space-y-1">
              {tree.map((node) => (
                <TreeItem key={node.id} node={node} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-display font-semibold text-gray-900 mb-4">待更新提醒</h3>
            {pending.length === 0 ? (
              <p className="text-gray-400 text-sm py-4 text-center">暂无待更新</p>
            ) : (
              <div className="space-y-3">
                {pending.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>
                      <p className="text-xs text-gray-500">
                        第{p.week_number}周 · {p.owner_name || '未指定'}
                      </p>
                    </div>
                    <Link
                      to="/weekly"
                      className="text-xs font-medium text-accent-500 hover:text-accent-600 flex items-center gap-1 flex-shrink-0 ml-2"
                    >
                      去更新 <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-display font-semibold text-gray-900 mb-4">风险通知</h3>
            {unread.length === 0 ? (
              <p className="text-gray-400 text-sm py-4 text-center">暂无风险通知</p>
            ) : (
              <div className="space-y-3">
                {unread.slice(0, 5).map((n) => (
                  <div
                    key={n.id}
                    className="p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
                    style={{
                      borderColor: n.risk_level === 'critical' ? '#fecaca' : '#fef3c7',
                      backgroundColor: n.risk_level === 'critical' ? '#fef2f2' : '#fffbeb',
                    }}
                    onClick={() => handleMarkRead(n.id)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          n.risk_level === 'critical' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
                        }`}
                      >
                        {n.risk_level === 'critical' ? '严重' : '警告'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
