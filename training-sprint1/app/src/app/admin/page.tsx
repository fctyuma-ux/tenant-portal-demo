import { redirect } from 'next/navigation';
import { getPageAuth } from '@/lib/page-helpers';

export default async function AdminDashboardPage() {
  const { userId, services } = await getPageAuth();

  const propertyId = await services.auth.getUserPropertyId(userId);
  if (!propertyId) redirect('/login');

  const stats = await services.dashboard.getStats(propertyId);

  const totalFeedback = stats.positiveFeedback + stats.negativeFeedback;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">ダッシュボード</h2>

      {/* 統計カード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="会話数" value={stats.conversationCount} />
        <StatCard label="質問数" value={stats.userMessageCount} />
        <StatCard
          label="満足度"
          value={stats.satisfactionRate !== null ? `${stats.satisfactionRate}%` : '---'}
          sub={
            totalFeedback > 0
              ? `${stats.positiveFeedback} / ${totalFeedback} 件`
              : 'フィードバックなし'
          }
        />
        <StatCard label="ドキュメント数" value={stats.documentCount} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最近の質問 */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">最近の質問</h3>
          {stats.recentMessages.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <p className="text-gray-500 text-sm">まだ質問がありません</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-100">
              {stats.recentMessages.map(
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
              <SummaryRow label="FAQ登録数" value={stats.faqCount} />
              <SummaryRow label="ドキュメント数" value={stats.documentCount} />
              <SummaryRow label="会話総数" value={stats.conversationCount} />
              <SummaryRow label="質問総数" value={stats.userMessageCount} />
              <SummaryRow label="ポジティブ評価" value={stats.positiveFeedback} />
              <SummaryRow label="ネガティブ評価" value={stats.negativeFeedback} />
            </div>
          </section>

          <section className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">最近の会話</h3>
            {stats.recentConversations.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <p className="text-gray-500 text-sm">まだ会話がありません</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-100">
                {stats.recentConversations.map(
                  (conv: { id: string; created_at: string; userName: string }) => (
                    <div key={conv.id} className="px-4 py-3 flex justify-between">
                      <span className="text-sm text-gray-700">{conv.userName}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(conv.created_at).toLocaleDateString('ja-JP', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )
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
