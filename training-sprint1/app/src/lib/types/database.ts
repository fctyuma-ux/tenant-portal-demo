export type Role = 'tenant' | 'admin';
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'error';
export type PublishStatus = 'unpublished' | 'published';
export type MessageRole = 'user' | 'assistant';
export type Feedback = 'positive' | 'negative';

export interface Property {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  property_id: string;
  email: string;
  password_hash: string;
  role: Role;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  property_id: string;
  file_name: string;
  file_path: string;
  page_count: number;
  analysis_status: AnalysisStatus;
  publish_status: PublishStatus;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  content: string;
  embedding: number[];
  page_number: number;
  page_image_path: string | null;
  created_at: string;
}

export interface FAQ {
  id: string;
  property_id: string;
  category: string;
  question: string;
  answer: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  feedback: Feedback | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  property_id: string;
  title: string;
  body: string;
  published_at: string;
  created_at: string;
  updated_at: string;
}
