/**
 * Notification types for API responses.
 * Matches Laravel's DatabaseNotification structure.
 */

export interface ApiNotification {
  id: string;
  type: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification extends ApiNotification {
  message?: string;
  title?: string;
}

export interface NotificationListResponse {
  data: ApiNotification[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
