import { getPageAuth } from '@/lib/page-helpers';
import { FaqManager } from './faq-manager';

export default async function FaqsPage() {
  const { userId, services } = await getPageAuth();

  const propertyId = await services.auth.getUserPropertyId(userId);
  if (!propertyId) return null;

  const faqs = await services.faq.getByPropertyId(propertyId);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">FAQ管理</h2>
      <FaqManager faqs={faqs} />
    </div>
  );
}
