import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: userData } = await supabase
    .from('users')
    .select('property_id')
    .eq('id', user.id)
    .single();

  if (!userData) redirect('/login');

  const propertyId = userData.property_id;

  // 物件に属するユーザーIDを取得
  const { data: propertyUsers } = await supabase
    .from('users')
    .select('id')
    .eq('property_id', propertyId);

  const userIds = (propertyUsers ?? []).map((u: { id: string }) => u.id);

  // 物件に属するユーザーの会話IDを取得
  const { data: propertyConversations } = await supabase
    .from('conversations')
    .select('id')
    .in('user_id', userIds.length > 0 ? userIds : ['']);

  const conversationIds = (propertyConversations ?? []).map((c: { id: string }) => c.id);

  // 統計データを並列取得
  const [
    { count: conversationCount },
    { count: userMessageCount },
    { count: positiveFeedback },
    { count: negativeFeedback },
    { count: documentCount },
    { count: faqCount },
    { data: recentMessages },
    { data: recentConversations },
  ] = await Promise.all([
    supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .in('user_id', userIds.length > 0 ? userIds : ['']),
    supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'user')
      .in('conversation_id', conversationIds.length > 0 ? conversationIds : ['']),
    supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('feedback', 'positive')
      .in('conversation_id', conversationIds.length > 0 ? conversationIds : ['']),
    supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('feedback', 'negative')
      .in('conversation_id', conversationIds.length > 0 ? conversationIds : ['']),
    supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', propertyId),
    supabase.from('faqs').select('*', { count: 'exact', head: true }).eq('property_id', propertyId),
    supabase
      .from('messages')
      .select('content, created_at')
      .eq('role', 'user')
      .in('conversation_id', conversationIds.length > 0 ? conversationIds : [''])
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('conversations')
      .select('id, created_at, users(name)')
      .in('user_id', userIds.length > 0 ? userIds : [''])
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const totalFeedback = (positiveFeedback ?? 0) + (negativeFeedback ?? 0);
  const satisfactionRate =
    totalFeedback > 0 ? Math.round(((positiveFeedback ?? 0) / totalFeedback) * 100) : null;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">ダッシュボード</h2>

      {/* 統計カード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="会話数" value={conversationCount ?? 0} />
        <StatCard label="質問数" value={userMessageCount ?? 0} />
        <StatCard
          label="満足度"
          value={satisfactionRate !== null ? `${satisfactionRate}%` : '---'}
          sub={
            totalFeedback > 0
              ? `${positiveFeedback ?? 0} / ${totalFeedback} 件`
              : 'フィードバックなし'
          }
        />
        <StatCard label="ドキュメント数" value={documentCount ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最近の質問 */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">最近の質問</h3>
          {(recentMessages ?? []).length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <p className="text-gray-500 text-sm">まだ質問がありません</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-100">
              {(recentMessages ?? []).map(
                (msg: { content: string; created_at: string }, i: number) => (
                  <div key={i} className="px-4 py-3">
                    <p className="text-sm text-gray-900 line-clamp-1">{msg.content}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(msg.created_at).toLocaleDateString('ja-JP', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* サマリー + 最近の会話 */}
        <div>
          <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">コンテンツサマリー</h3>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
              <SummaryRow label="FAQ登録数" value={faqCount ?? 0} />
              <SummaryRow label="ドキュメント数" value={documentCount ?? 0} />
              <SummaryRow label="会話総数" value={conversationCount ?? 0} />
              <SummaryRow label="質問総数" value={userMessageCount ?? 0} />
              <SummaryRow label="ポジティブ評価" value={positiveFeedback ?? 0} />
              <SummaryRow label="ネガティブ評価" value={negativeFeedback ?? 0} />
            </div>
          </section>

          <section className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">最近の会話</h3>
            {(recentConversations ?? []).length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <p className="text-gray-500 text-sm">まだ会話がありません</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-100">
                {(recentConversations ?? []).map(
                  (conv: {
                    id: string;
                    created_at: string;
                    users: { name: string }[] | { name: string } | null;
                  }) => {
                    const userName = Array.isArray(conv.users)
                      ? (conv.users[0]?.name ?? '不明')
                      : (conv.users?.name ?? '不明');
                    return (
                      <div key={conv.id} className="px-4 py-3 flex justify-between">
                        <span className="text-sm text-gray-700">{userName}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(conv.created_at).toLocaleDateString('ja-JP', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}
