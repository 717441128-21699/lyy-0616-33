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

export async function fetchHeatmap(params?: Record<string, string>): Promise<HeatmapData> {
  return request<HeatmapData>(`/api/heatmap${buildQuery(params)}`);
}

export async function fetchArchivedOkrs(params?: Record<string, string>): Promise<OKR[]> {
  return request<OKR[]>(`/api/archive${buildQuery(params)}`);
}

export async function archiveOkr(id: string): Promise<OKR> {
  return request<OKR>(`/api/archive/${id}`, { method: 'POST' });
}
