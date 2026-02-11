import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { HomeClient } from './home-client';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: userData } = await supabase
    .from('users')
    .select('name, role, property_id')
    .eq('id', user.id)
    .single();

  if (userData?.role === 'admin') redirect('/admin');

  const { data: property } = await supabase
    .from('properties')
    .select('name')
    .eq('id', userData?.property_id)
    .single();

  // カテゴリ一覧を取得
  const { data: faqCategories } = await supabase
    .from('faqs')
    .select('category')
    .eq('property_id', userData?.property_id ?? '');

  const categories = [
    ...new Set((faqCategories ?? []).map((f: { category: string }) => f.category)),
  ];

  // お知らせ一覧を取得
  const { data: announcements } = await supabase
    .from('announcements')
    .select('id, title, body, published_at')
    .eq('property_id', userData?.property_id ?? '')
    .order('published_at', { ascending: false })
    .limit(5);

  return (
    <HomeClient
      userName={userData?.name ?? ''}
      propertyName={property?.name ?? ''}
      categories={categories}
      announcements={announcements ?? []}
    />
  );
}
