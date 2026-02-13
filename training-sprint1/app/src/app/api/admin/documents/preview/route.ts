import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, createAdminServices, errorResponse } from '@/lib/api-helpers';
import { DocumentPreviewSchema } from '@/schemas/document';

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth.ok) return auth.response;

  const userInfo = await auth.services.auth.getUserRoleAndPropertyId(auth.user.id);
  if (!userInfo || userInfo.role !== 'admin') {
    return errorResponse('FORBIDDEN', '権限がありません', 403);
  }

  const body = await request.json();
  const parsed = DocumentPreviewSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
  }

  try {
    const adminServices = createAdminServices();
    const answer = await adminServices.chatAnswer.generateAnswer(
      parsed.data.content,
      userInfo.propertyId,
      { includeUnpublished: true }
    );
    return NextResponse.json({ content: answer.content, sources: answer.sources });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI回答の生成に失敗しました';
    console.error('generateAnswer error:', message);
    return errorResponse('AI_ERROR', message, 500);
  }
}
