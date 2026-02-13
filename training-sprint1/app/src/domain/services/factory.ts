import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseUserRepository } from '@/domain/repositories/supabase/user-repository';
import { SupabaseDocumentRepository } from '@/domain/repositories/supabase/document-repository';
import { SupabaseDocumentChunkRepository } from '@/domain/repositories/supabase/document-chunk-repository';
import { SupabaseFaqRepository } from '@/domain/repositories/supabase/faq-repository';
import { SupabaseConversationRepository } from '@/domain/repositories/supabase/conversation-repository';
import { SupabaseMessageRepository } from '@/domain/repositories/supabase/message-repository';
import { SupabaseStorageRepository } from '@/domain/repositories/supabase/storage-repository';
import { SupabasePropertyRepository } from '@/domain/repositories/supabase/property-repository';
import { SupabaseAnnouncementRepository } from '@/domain/repositories/supabase/announcement-repository';
import { OpenAIClient } from '@/lib/openai/ai-client';
import { AuthService } from './auth-service';
import { ConversationService } from './conversation-service';
import { MessageService } from './message-service';
import { FaqService } from './faq-service';
import { DocumentService } from './document-service';
import { ChatAnswerService } from './chat-answer';
import { PdfAnalysisService } from './pdf-analysis';
import { DashboardService } from './dashboard-service';

export function createServices(supabase: SupabaseClient) {
  const userRepo = new SupabaseUserRepository(supabase);
  const documentRepo = new SupabaseDocumentRepository(supabase);
  const chunkRepo = new SupabaseDocumentChunkRepository(supabase);
  const faqRepo = new SupabaseFaqRepository(supabase);
  const conversationRepo = new SupabaseConversationRepository(supabase);
  const messageRepo = new SupabaseMessageRepository(supabase);
  const storageRepo = new SupabaseStorageRepository(supabase);
  const propertyRepo = new SupabasePropertyRepository(supabase);
  const announcementRepo = new SupabaseAnnouncementRepository(supabase);
  const aiClient = new OpenAIClient();

  return {
    auth: new AuthService(userRepo),
    conversation: new ConversationService(conversationRepo),
    message: new MessageService(messageRepo),
    faq: new FaqService(faqRepo),
    document: new DocumentService(documentRepo, storageRepo),
    chatAnswer: new ChatAnswerService(chunkRepo, documentRepo, faqRepo, aiClient),
    pdfAnalysis: new PdfAnalysisService(documentRepo, chunkRepo, storageRepo, aiClient),
    dashboard: new DashboardService(userRepo, conversationRepo, messageRepo, documentRepo, faqRepo),
    property: propertyRepo,
    announcement: announcementRepo,
  };
}

export type Services = ReturnType<typeof createServices>;
