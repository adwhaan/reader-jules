export interface User {
  id: string;
  device_name: string;
  email_hint?: string;
  last_sync_ts: string;
  created_at: string;
}

export interface Folder {
  id: number;
  user_id: string;
  name: string;
  parent_folder_id?: number;
  sort_order: number;
  created_at: string;
}

export interface Feed {
  id: number;
  user_id: string;
  url: string;
  display_name: string;
  folder_id?: number;
  favicon_url?: string;
  favicon_cache_path?: string;
  last_fetched_at?: string;
  fetch_error_count: number;
  is_active: boolean;
  created_at: string;
}

export interface Article {
  id: string; // GUID
  feed_id: number;
  title: string;
  published_at: string;
  updated_at?: string;
  author?: string;
  summary?: string;
  content_html?: string;
  content_cache_path?: string;
  featured_image_url?: string;
  featured_image_cache_path?: string;
  external_link_url: string;
  created_at: string;
}

export interface ArticleState {
  id: string; // guid:user_device_id
  guid: string;
  user_device_id: string;
  is_read: boolean;
  is_starred: boolean;
  folder_assignments?: string; // JSON array
  tag_assignments?: string;    // JSON array
  notes?: string;
  last_changed_ts: string;
}

export interface Tag {
  id: number;
  user_id: string;
  name: string;
  color_hex: string;
  created_at: string;
}

export interface Bookmark {
  id: number;
  user_id: string;
  guid: string;
  notes?: string;
  created_at: string;
}

export interface SyncLog {
  id: number;
  guid: string;
  user_device_id: string;
  entity_type: 'article' | 'state';
  operation: 'UPDATE_STATE' | 'DELETE_STATE' | 'NEW_ARTICLE';
  payload_json: string;
  created_ts: string;
  pushed_to_cloud: boolean;
  pulled_from_cloud: boolean;
  resolved_conflict: boolean;
}

export interface Setting {
  id: string; // Key
  value_json: string;
  updated_at: string;
}
