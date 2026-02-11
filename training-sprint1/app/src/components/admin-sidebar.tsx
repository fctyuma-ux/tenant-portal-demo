'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/admin', label: 'ダッシュボード' },
  { href: '/admin/documents', label: 'ドキュメント管理' },
  { href: '/admin/faqs', label: 'FAQ管理' },
];

export function AdminSidebar({
  userName,
  propertyName,
}: {
  userName: string;
  propertyName: string;
}) {
  const pathname = usePathname();

  return (
    <nav className="w-64 min-h-screen bg-white border-r border-gray-200 p-4 flex flex-col">
      <h1 className="text-lg font-bold text-gray-900 mb-1">管理者パネル</h1>
      <p className="text-xs text-gray-500 mb-6">{propertyName}</p>

      <ul className="space-y-1 flex-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block px-3 py-2 text-sm rounded-md ${
                  isActive
                    ? 'font-medium text-blue-700 bg-blue-50'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-gray-200 pt-4">
        <div className="text-sm text-gray-600 mb-2">{userName}</div>
        <form action="/api/auth/signout" method="post">
          <button type="submit" className="text-sm text-gray-500 hover:text-gray-700">
            ログアウト
          </button>
        </form>
      </div>
    </nav>
  );
}
