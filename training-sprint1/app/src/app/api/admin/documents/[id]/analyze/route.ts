import { NextRequest } from 'next/server';
import { getAuthContext, createAdminServices, errorResponse } from '@/lib/api-helpers';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: documentId } = await params;
  const auth = await getAuthContext();
  if (!auth.ok) return auth.response;

  try {
    await auth.services.auth.requireAdmin(auth.user.id);
  } catch {
    return errorResponse('FORBIDDEN', '権限がありません', 403);
  }

  const adminServices = createAdminServices();
  const result = await adminServices.pdfAnalysis.analyzePdf(documentId);

  if (!result.success) {
    return errorResponse('ANALYSIS_FAILED', result.error ?? '解析に失敗しました', 500);
  }

  return Response.json({ success: true });
}
