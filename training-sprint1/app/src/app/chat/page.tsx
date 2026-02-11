import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ChatClient } from './chat-client';

export default async function ChatPage() {
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

  const { data: property } = await supabase
    .from('properties')
    .select('name')
    .eq('id', userData?.property_id)
    .single();

  return <ChatClient userName={userData?.name ?? ''} propertyName={property?.name ?? ''} />;
}
