export interface Source {
  document_name: string;
  page_number: number;
  page_image_url: string | null;
}

export interface ChatAnswerResult {
  content: string;
  sources: Source[];
}

export interface PdfAnalysisResult {
  success: boolean;
  error?: string;
}

export interface DashboardStats {
  conversationCount: number;
  userMessageCount: number;
  positiveFeedback: number;
  negativeFeedback: number;
  documentCount: number;
  faqCount: number;
  satisfactionRate: number | null;
  recentMessages: { content: string; created_at: string }[];
  recentConversations: { id: string; created_at: string; userName: string }[];
}
