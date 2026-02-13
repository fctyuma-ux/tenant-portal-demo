import { getPageAuth } from '@/lib/page-helpers';
import { ChatClient } from './chat-client';

export default async function ChatPage() {
  const { userId, services } = await getPageAuth();

  const propertyId = await services.auth.getUserPropertyId(userId);

  const [userName, propertyName] = await Promise.all([
    services.auth.getUserName(userId),
    services.property.findNameById(propertyId ?? ''),
  ]);

  return <ChatClient userName={userName ?? ''} propertyName={propertyName ?? ''} />;
}
