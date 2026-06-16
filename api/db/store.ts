export interface Department {
  id: string
  name: string
  parent_id: string | null
  created_at: string
}

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'employee'
  department_id: string | null
  created_at: string
}

export interface OKR {
  id: string
  title: string
  description: string
  level: 'company' | 'department' | 'individual'
  owner_id: string
  department_id: string | null
  parent_okr_id: string | null
  quarter: string
  year: number
  status: 'draft' | 'active' | 'completed' | 'archived'
  overall_progress: number
  created_at: string
  updated_at: string
}

export interface KeyResult {
  id: string
  okr_id: string
  title: string
  target_value: number
  current_value: number
  unit: string
  update_method: 'manual' | 'auto'
  data_source_url: string | null
  progress: number
  created_at: string
  updated_at: string
}

export interface WeeklyUpdate {
  id: string
  okr_id: string
  kr_id: string
  week_number: number
  year: number
  progress_description: string
  confidence_index: number
  kr_current_value: number
  updated_by: string
  created_at: string
}

export interface Review {
  id: string
  okr_id: string
  quarter: string
  year: number
  overall_score: number
  what_went_well: string
  what_to_improve: string
  next_actions: string
  reviewed_by: string
  reviewed_at: string
}

export interface KrScore {
  id: string
  review_id: string
  kr_id: string
  score: number
}

export interface Dependency {
  id: string
  dependent_okr_id: string
  depended_okr_id: string
  status: 'healthy' | 'at_risk' | 'critical'
  created_at: string
}

export interface Notification {
  id: string
  dependency_id: string
  user_id: string
  message: string
  risk_level: 'warning' | 'critical'
  is_read: boolean
  created_at: string
}

export const departments: Department[] = [
  { id: 'dept-1', name: '技术部', parent_id: null, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'dept-2', name: '产品部', parent_id: null, created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'dept-3', name: '市场部', parent_id: null, created_at: '2026-01-01T00:00:00.000Z' },
]

export const users: User[] = [
  { id: 'user-1', name: '张伟', email: 'zhangwei@company.com', role: 'admin', department_id: 'dept-1', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'user-2', name: '李明', email: 'liming@company.com', role: 'manager', department_id: 'dept-1', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'user-3', name: '王芳', email: 'wangfang@company.com', role: 'manager', department_id: 'dept-2', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'user-4', name: '刘洋', email: 'liuyang@company.com', role: 'employee', department_id: 'dept-1', created_at: '2026-01-01T00:00:00.000Z' },
  { id: 'user-5', name: '陈静', email: 'chenjing@company.com', role: 'employee', department_id: 'dept-2', created_at: '2026-01-01T00:00:00.000Z' },
]

export const okrs: OKR[] = [
  {
    id: 'okr-1', title: '提升公司整体运营效率', description: '2026年Q2公司级OKR',
    level: 'company', owner_id: 'user-1', department_id: null, parent_okr_id: null,
    quarter: 'Q2', year: 2026, status: 'active', overall_progress: 45,
    created_at: '2026-04-01T00:00:00.000Z', updated_at: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'okr-2', title: '技术部提升研发效能', description: '技术部Q2核心OKR',
    level: 'department', owner_id: 'user-2', department_id: 'dept-1', parent_okr_id: 'okr-1',
    quarter: 'Q2', year: 2026, status: 'active', overall_progress: 52,
    created_at: '2026-04-01T00:00:00.000Z', updated_at: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'okr-3', title: '产品部提升用户体验', description: '产品部Q2核心OKR',
    level: 'department', owner_id: 'user-3', department_id: 'dept-2', parent_okr_id: 'okr-1',
    quarter: 'Q2', year: 2026, status: 'active', overall_progress: 38,
    created_at: '2026-04-01T00:00:00.000Z', updated_at: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'okr-4', title: '提升前端开发效率', description: '刘洋Q2个人OKR',
    level: 'individual', owner_id: 'user-4', department_id: 'dept-1', parent_okr_id: 'okr-2',
    quarter: 'Q2', year: 2026, status: 'active', overall_progress: 55,
    created_at: '2026-04-01T00:00:00.000Z', updated_at: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'okr-5', title: '优化用户调研流程', description: '陈静Q2个人OKR',
    level: 'individual', owner_id: 'user-5', department_id: 'dept-2', parent_okr_id: 'okr-3',
    quarter: 'Q2', year: 2026, status: 'active', overall_progress: 30,
    created_at: '2026-04-01T00:00:00.000Z', updated_at: '2026-04-01T00:00:00.000Z',
  },
]

export const keyResults: KeyResult[] = [
  { id: 'kr-1', okr_id: 'okr-1', title: '运营成本降低', target_value: 20, current_value: 8, unit: '%', update_method: 'manual', data_source_url: null, progress: 40, created_at: '2026-04-01T00:00:00.000Z', updated_at: '2026-04-01T00:00:00.000Z' },
  { id: 'kr-2', okr_id: 'okr-1', title: '客户满意度提升', target_value: 95, current_value: 78, unit: '分', update_method: 'manual', data_source_url: null, progress: 82, created_at: '2026-04-01T00:00:00.000Z', updated_at: '2026-04-01T00:00:00.000Z' },
  { id: 'kr-3', okr_id: 'okr-1', title: '内部流程自动化率', target_value: 80, current_value: 45, unit: '%', update_method: 'manual', data_source_url: null, progress: 56, created_at: '2026-04-01T00:00:00.000Z', updated_at: '2026-04-01T00:00:00.000Z' },
  { id: 'kr-4', okr_id: 'okr-2', title: '代码部署频率', target_value: 50, current_value: 32, unit: '次/月', update_method: 'manual', data_source_url: null, progress: 64, created_at: '2026-04-01T00:00:00.000Z', updated_at: '2026-04-01T00:00:00.000Z' },
  { id: 'kr-5', okr_id: 'okr-2', title: '线上故障率降低', target_value: 0.5, current_value: 1.2, unit: '次/周', update_method: 'manual', data_source_url: null, progress: 42, created_at: '2026-04-01T00:00:00.000Z', updated_at: '2026-04-01T00:00:00.000Z' },
  { id: 'kr-6', okr_id: 'okr-2', title: '自动化测试覆盖率', target_value: 85, current_value: 62, unit: '%', update_method: 'manual', data_source_url: null, progress: 73, created_at: '2026-04-01T00:00:00.000Z', updated_at: '2026-04-01T00:00:00.000Z' },
  { id: 'kr-7', okr_id: 'okr-3', title: 'NPS评分提升', target_value: 70, current_value: 45, unit: '分', update_method: 'manual', data_source_url: null, progress: 64, created_at: '2026-04-01T00:00:00.000Z', updated_at: '2026-04-01T00:00:00.000Z' },
  { id: 'kr-8', okr_id: 'okr-3', title: '用户留存率', target_value: 90, current_value: 75, unit: '%', update_method: 'manual', data_source_url: null, progress: 83, created_at: '2026-04-01T00:00:00.000Z', updated_at: '2026-04-01T00:00:00.000Z' },
  { id: 'kr-9', okr_id: 'okr-4', title: '组件库完善度', target_value: 100, current_value: 68, unit: '%', update_method: 'manual', data_source_url: null, progress: 68, created_at: '2026-04-01T00:00:00.000Z', updated_at: '2026-04-01T00:00:00.000Z' },
  { id: 'kr-10', okr_id: 'okr-4', title: '页面加载速度优化', target_value: 2, current_value: 3.2, unit: '秒', update_method: 'manual', data_source_url: null, progress: 63, created_at: '2026-04-01T00:00:00.000Z', updated_at: '2026-04-01T00:00:00.000Z' },
  { id: 'kr-11', okr_id: 'okr-5', title: '月度调研次数', target_value: 8, current_value: 3, unit: '次', update_method: 'manual', data_source_url: null, progress: 38, created_at: '2026-04-01T00:00:00.000Z', updated_at: '2026-04-01T00:00:00.000Z' },
  { id: 'kr-12', okr_id: 'okr-5', title: '调研报告产出', target_value: 4, current_value: 1, unit: '份', update_method: 'manual', data_source_url: null, progress: 25, created_at: '2026-04-01T00:00:00.000Z', updated_at: '2026-04-01T00:00:00.000Z' },
  { id: 'kr-13', okr_id: 'okr-5', title: '用户反馈响应时间', target_value: 24, current_value: 48, unit: '小时', update_method: 'manual', data_source_url: null, progress: 50, created_at: '2026-04-01T00:00:00.000Z', updated_at: '2026-04-01T00:00:00.000Z' },
]

export const weeklyUpdates: WeeklyUpdate[] = [
  { id: 'wu-1', okr_id: 'okr-4', kr_id: 'kr-9', week_number: 23, year: 2026, progress_description: '完成5个新组件开发', confidence_index: 8, kr_current_value: 60, updated_by: 'user-4', created_at: '2026-06-07T00:00:00.000Z' },
  { id: 'wu-2', okr_id: 'okr-5', kr_id: 'kr-11', week_number: 23, year: 2026, progress_description: '完成2次用户调研', confidence_index: 6, kr_current_value: 2, updated_by: 'user-5', created_at: '2026-06-07T00:00:00.000Z' },
  { id: 'wu-3', okr_id: 'okr-2', kr_id: 'kr-6', week_number: 23, year: 2026, progress_description: '新增自动化测试用例42个', confidence_index: 7, kr_current_value: 58, updated_by: 'user-2', created_at: '2026-06-07T00:00:00.000Z' },
]

export const reviews: Review[] = []

export const krScores: KrScore[] = []

export const dependencies: Dependency[] = [
  { id: 'dep-1', dependent_okr_id: 'okr-4', depended_okr_id: 'okr-3', status: 'at_risk', created_at: '2026-04-15T00:00:00.000Z' },
  { id: 'dep-2', dependent_okr_id: 'okr-5', depended_okr_id: 'okr-2', status: 'healthy', created_at: '2026-04-15T00:00:00.000Z' },
]

export const notifications: Notification[] = [
  { id: 'notif-1', dependency_id: 'dep-1', user_id: 'user-4', message: '您依赖的OKR「产品部提升用户体验」进度落后（38%），存在风险', risk_level: 'warning', is_read: false, created_at: '2026-04-15T00:00:00.000Z' },
  { id: 'notif-2', dependency_id: 'dep-1', user_id: 'user-5', message: 'OKR「提升前端开发效率」依赖您的OKR进度，请关注', risk_level: 'warning', is_read: false, created_at: '2026-04-15T00:00:00.000Z' },
]

export function recalcOkrProgress(okrId: string): void {
  const krs = keyResults.filter(kr => kr.okr_id === okrId)
  if (krs.length === 0) return
  const avg = krs.reduce((sum, kr) => sum + kr.progress, 0) / krs.length
  const okr = okrs.find(o => o.id === okrId)
  if (okr) {
    okr.overall_progress = Math.round(avg * 100) / 100
    okr.updated_at = new Date().toISOString()
  }
}

export function findUserById(id: string): User | undefined {
  return users.find(u => u.id === id)
}

export function findOkrById(id: string): OKR | undefined {
  return okrs.find(o => o.id === id)
}

export function findKeyResultById(id: string): KeyResult | undefined {
  return keyResults.find(kr => kr.id === id)
}
