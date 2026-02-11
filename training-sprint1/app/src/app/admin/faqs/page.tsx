import { createClient } from '@/lib/supabase/server';
import { FaqManager } from './faq-manager';

export default async function FaqsPage() {
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

  const { data: faqs } = await supabase
    .from('faqs')
    .select('*')
    .eq('property_id', userData.property_id)
    .order('category')
    .order('created_at', { ascending: false });

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">FAQ管理</h2>
      <FaqManager faqs={faqs ?? []} />
    </div>
  );
}
