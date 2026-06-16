import type {
  OKR,
  OKRWithDetails,
  TreeNode,
  KeyResult,
  WeeklyUpdate,
  PendingUpdate,
  Review,
  Dependency,
  DependencyGraphData,
  Notification,
  HeatmapData,
  ActivityLog,
} from '@/types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return json.data as T;
}

function buildQuery(params?: Record<string, string>): string {
  if (!params) return '';
  const search = new URLSearchParams(params);
  return `?${search.toString()}`;
}

export async function fetchOkrs(params?: Record<string, string>): Promise<OKR[]> {
  return request<OKR[]>(`/api/okrs${buildQuery(params)}`);
}

export async function fetchOkrById(id: string): Promise<OKRWithDetails> {
  return request<OKRWithDetails>(`/api/okrs/${id}`);
}

export async function fetchAlignmentTree(): Promise<TreeNode[]> {
  return request<TreeNode[]>('/api/okrs/alignment-tree');
}

export async function createOkr(data: Partial<OKR>): Promise<OKR> {
  return request<OKR>('/api/okrs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateOkr(id: string, data: Partial<OKR>): Promise<OKR> {
  return request<OKR>(`/api/okrs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteOkr(id: string): Promise<void> {
  await request<void>(`/api/okrs/${id}`, { method: 'DELETE' });
}

export async function createKeyResult(okrId: string, data: Partial<KeyResult>): Promise<KeyResult> {
  return request<KeyResult>(`/api/okrs/${okrId}/key-results`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateKeyResult(okrId: string, krId: string, data: Partial<KeyResult>): Promise<KeyResult> {
  return request<KeyResult>(`/api/okrs/${okrId}/key-results/${krId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteKeyResult(okrId: string, krId: string): Promise<void> {
  await request<void>(`/api/okrs/${okrId}/key-results/${krId}`, { method: 'DELETE' });
}

export async function updateKeyResultProgress(okrId: string, krId: string, currentValue: number): Promise<KeyResult> {
  return request<KeyResult>(`/api/okrs/${okrId}/key-results/${krId}/progress`, {
    method: 'PUT',
    body: JSON.stringify({ current_value: currentValue }),
  });
}

export async function syncKeyResult(okrId: string, krId: string): Promise<KeyResult> {
  return request<KeyResult>(`/api/okrs/${okrId}/key-results/${krId}/sync`, {
    method: 'PUT',
  });
}

export async function fetchWeeklyUpdates(params?: Record<string, string>): Promise<WeeklyUpdate[]> {
  return request<WeeklyUpdate[]>(`/api/weekly-updates${buildQuery(params)}`);
}

export async function fetchPendingUpdates(): Promise<PendingUpdate[]> {
  return request<PendingUpdate[]>('/api/weekly-updates/pending');
}

export async function createWeeklyUpdate(data: Record<string, unknown>): Promise<WeeklyUpdate> {
  return request<WeeklyUpdate>('/api/weekly-updates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchReviews(params?: Record<string, string>): Promise<Review[]> {
  return request<Review[]>(`/api/reviews${buildQuery(params)}`);
}

export async function fetchReviewsByOkr(okrId: string): Promise<Review[]> {
  return request<Review[]>(`/api/reviews/okr/${okrId}`);
}

export async function createReview(data: Record<string, unknown>): Promise<Review> {
  return request<Review>('/api/reviews', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchDependencies(params?: Record<string, string>): Promise<Dependency[]> {
  return request<Dependency[]>(`/api/dependencies${buildQuery(params)}`);
}

export async function fetchDependencyGraph(): Promise<DependencyGraphData> {
  return request<DependencyGraphData>('/api/dependencies/graph');
}

export async function createDependency(data: { dependent_okr_id: string; depended_okr_id: string }): Promise<Dependency> {
  return request<Dependency>('/api/dependencies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteDependency(id: string): Promise<void> {
  await request<void>(`/api/dependencies/${id}`, { method: 'DELETE' });
}

export async function fetchNotifications(params?: Record<string, string>): Promise<Notification[]> {
  return request<Notification[]>(`/api/dependencies/notifications${buildQuery(params)}`);
}

export async function markNotificationRead(id: string): Promise<Notification> {
  return request<Notification>(`/api/dependencies/notifications/${id}/read`, {
    method: 'PUT',
  });
}

export async function markNotificationsReadBatch(ids: string[]): Promise<{ updated: number }> {
  return request<{ updated: number }>('/api/dependencies/notifications/read-batch', {
    method: 'PUT',
    body: JSON.stringify({ ids }),
  });
}

export async function fetchHeatmap(params?: Record<string, string>): Promise<HeatmapData> {
  return request<HeatmapData>(`/api/heatmap${buildQuery(params)}`);
}

export async function fetchArchivedOkrs(params?: Record<string, string>): Promise<OKR[]> {
  return request<OKR[]>(`/api/archive${buildQuery(params)}`);
}

export async function archiveOkr(id: string): Promise<OKR> {
  return request<OKR>(`/api/archive/${id}`, { method: 'POST' });
}

export interface QuarterlyReport {
  quarter: string;
  year: number;
  generated_at: string;
  summary: {
    total_okrs: number;
    completed_okrs: number;
    avg_okr_progress: number;
    total_krs: number;
    completed_krs: number;
    at_risk_dependencies: number;
  };
  okrs: Array<{
    okr_id: string;
    title: string;
    description: string;
    level: string;
    owner_name: string | null;
    department_id: string | null;
    department_name: string | null;
    overall_progress: number;
    status: string;
    kr_completed_count: number;
    kr_total_count: number;
    kr_avg_progress: number;
    key_results: Array<{
      id: string;
      title: string;
      target_value: number;
      current_value: number;
      unit: string;
      progress: number;
      completed: boolean;
    }>;
    reviews: Array<{
      id: string;
      overall_score: number;
      what_went_well: string;
      what_to_improve: string;
      next_actions: string;
      reviewer_name: string | null;
      reviewed_at: string;
      kr_scores: Array<{ kr_id: string; kr_title: string | null; score: number }>;
    }>;
    dependencies: Array<{
      dependency_id: string;
      type: string;
      other_okr_title: string | null;
      status: string;
    }>;
  }>;
}

export async function fetchQuarterlyReport(quarter: string, year: number): Promise<QuarterlyReport> {
  return request<QuarterlyReport>(`/api/archive/report?quarter=${quarter}&year=${year}`);
}

export async function fetchActivityLogs(okrId: string): Promise<ActivityLog[]> {
  return request<ActivityLog[]>(`/api/activity/${okrId}`);
}
