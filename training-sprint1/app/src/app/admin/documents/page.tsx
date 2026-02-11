import { createClient } from '@/lib/supabase/server';
import { DocumentUploader } from './document-uploader';
import { DocumentTable } from './document-table';
import { TestPreview } from './test-preview';

export default async function DocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: userData } = await supabase
    .from('users')
    .select('property_id')
    .eq('id', user.id)
    .single();

  if (!userData) return null;

  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('property_id', userData.property_id)
    .order('created_at', { ascending: false });

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">ドキュメント管理</h2>

      <DocumentUploader />

      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">登録済みドキュメント</h3>
        <DocumentTable documents={documents ?? []} />
      </div>

      <div className="mt-8">
        <TestPreview />
      </div>
    </div>
  );
}
