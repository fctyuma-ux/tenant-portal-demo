import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin-sidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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

  if (userData?.role !== 'admin') redirect('/chat');

  const { data: property } = await supabase
    .from('properties')
    .select('name')
    .eq('id', userData.property_id)
    .single();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <AdminSidebar userName={userData.name} propertyName={property?.name ?? ''} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
