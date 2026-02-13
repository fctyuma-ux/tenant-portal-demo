import { getPageAuth } from '@/lib/page-helpers';
import { DocumentUploader } from './document-uploader';
import { DocumentTable } from './document-table';
import { TestPreview } from './test-preview';

export default async function DocumentsPage() {
  const { userId, services } = await getPageAuth();

  const propertyId = await services.auth.getUserPropertyId(userId);
  if (!propertyId) return null;

  const documents = await services.document.getByPropertyId(propertyId);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">ドキュメント管理</h2>

      <DocumentUploader />

      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">登録済みドキュメント</h3>
        <DocumentTable documents={documents} />
      </div>

      <div className="mt-8">
        <TestPreview />
      </div>
    </div>
  );
}
