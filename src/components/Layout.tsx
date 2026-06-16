import { ReactNode, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Target, CalendarCheck, Grid3x3, Star, Archive, Link2, Bell } from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';

const navItems = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/okrs', label: 'OKR管理', icon: Target },
  { path: '/weekly', label: '周报更新', icon: CalendarCheck },
  { path: '/heatmap', label: '进度热力图', icon: Grid3x3 },
  { path: '/review', label: '复盘评分', icon: Star },
  { path: '/archive', label: '历史归档', icon: Archive },
  { path: '/dependencies', label: '依赖管理', icon: Link2 },
];

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications, location.pathname]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-body">
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-brand-800 text-white flex flex-col z-30">
        <div className="h-16 flex items-center px-6 border-b border-brand-700">
          <Target className="w-7 h-7 text-accent-500 mr-3" />
          <span className="text-lg font-display font-bold tracking-tight">OKR目标管理系统</span>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(path)
                  ? 'bg-brand-900 text-white'
                  : 'text-brand-200 hover:bg-brand-700 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-brand-700">
          <p className="text-xs text-brand-300 text-center">OKR Management System v1.0</p>
        </div>
      </aside>

      <div className="ml-64 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-20">
          <h1 className="text-lg font-display font-semibold text-gray-800">
            {navItems.find((n) => isActive(n.path))?.label || 'OKR目标管理系统'}
          </h1>
          <div className="relative">
            <Bell className="w-5 h-5 text-gray-500 hover:text-brand-600 cursor-pointer transition-colors" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-danger text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
