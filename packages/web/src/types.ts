export interface Document {
  id: string;
  title: string;
  content: string;
  tags: string;
  created_at: string;
  updated_at: string;
  word_count: number;
  reading_time_min: number;
}

export interface Bookmark {
  id: string;
  document_id: string;
  position: {
    type: string;
    sectionId?: string;
    scrollPercent?: number;
    label?: string;
  };
  label: string | null;
  created_at: string;
}

export interface ReadingHistory {
  id: string;
  document_id: string;
  last_position: {
    type: string;
    sectionId?: string;
    scrollPercent?: number;
  };
  last_read_at: string;
}
