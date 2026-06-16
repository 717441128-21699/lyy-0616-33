export interface Department {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
  department_id: string | null;
  created_at: string;
}

export interface OKR {
  id: string;
  title: string;
  description: string;
  level: 'company' | 'department' | 'individual';
  owner_id: string;
  owner_name?: string;
  department_id: string | null;
  parent_okr_id: string | null;
  quarter: string;
  year: number;
  status: 'draft' | 'active' | 'completed' | 'archived';
  overall_progress: number;
  created_at: string;
  updated_at: string;
}

export interface KeyResult {
  id: string;
  okr_id: string;
  title: string;
  target_value: number;
  current_value: number;
  unit: string;
  update_method: 'manual' | 'auto';
  data_source_url: string | null;
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface OKRWithDetails extends OKR {
  key_results: KeyResult[];
}

export interface TreeNode extends OKRWithDetails {
  children: TreeNode[];
}

export interface WeeklyUpdate {
  id: string;
  okr_id: string;
  kr_id: string;
  week_number: number;
  year: number;
  progress_description: string;
  confidence_index: number;
  kr_current_value: number;
  updated_by: string;
  updated_by_name?: string;
  created_at: string;
}

export interface Review {
  id: string;
  okr_id: string;
  quarter: string;
  year: number;
  overall_score: number;
  what_went_well: string;
  what_to_improve: string;
  next_actions: string;
  reviewed_by: string;
  reviewer_name?: string;
  okr_title?: string;
  reviewed_at: string;
  created_at: string;
  kr_scores: KrScore[];
}

export interface KrScore {
  id: string;
  review_id: string;
  kr_id: string;
  score: number;
  comment: string | null;
  created_at: string;
}

export interface Dependency {
  id: string;
  dependent_okr_id: string;
  depended_okr_id: string;
  dependent_okr_title?: string;
  depended_okr_title?: string;
  status: 'healthy' | 'at_risk' | 'critical';
  created_at: string;
}

export interface Notification {
  id: string;
  dependency_id: string;
  user_id: string;
  message: string;
  risk_level: 'info' | 'warning' | 'critical';
  is_read: boolean;
  dependency_status?: string;
  dependent_okr_id?: string;
  depended_okr_id?: string;
  created_at: string;
}

export interface HeatmapData {
  members: { user_id: string; user_name: string; department_name: string | null; department_id: string | null }[];
  okrs: { okr_id: string; owner_id: string; title: string; progress: number; level: string; quarter: string; year: number; department_id: string | null; risk_status: string | null }[];
}

export interface DependencyGraphData {
  nodes: { id: string; title: string; level: string; progress: number }[];
  edges: { source: string; target: string; status: string }[];
}

export interface PendingUpdate {
  id: string;
  title: string;
  owner_id: string;
  owner_name: string | null;
  week_number: number;
  year: number;
}

export interface ActivityLog {
  id: string;
  okr_id: string;
  type: 'kr_update' | 'kr_sync' | 'weekly_update' | 'review' | 'dependency_risk' | 'status_change';
  related_id: string | null;
  actor_id: string | null;
  actor_name: string | null;
  description: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  detail?: Record<string, unknown>;
}
