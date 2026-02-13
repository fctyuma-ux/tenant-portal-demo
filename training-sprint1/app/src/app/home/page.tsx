import { redirect } from 'next/navigation';
import { getPageAuth } from '@/lib/page-helpers';
import { HomeClient } from './home-client';

export default async function HomePage() {
  const { userId, services } = await getPageAuth();

  const info = await services.auth.getUserRoleAndPropertyId(userId);
  if (!info) redirect('/login');
  if (info.role === 'admin') redirect('/admin');

  const [userName, propertyName, faqs, announcements] = await Promise.all([
    services.auth.getUserName(userId),
    services.property.findNameById(info.propertyId),
    services.faq.getByPropertyId(info.propertyId),
    services.announcement.findRecentByPropertyId(info.propertyId, 5),
  ]);

  const categories = [...new Set(faqs.map((f) => f.category))];

  return (
    <HomeClient
      userName={userName ?? ''}
      propertyName={propertyName ?? ''}
      categories={categories}
      announcements={announcements}
    />
  );
}
