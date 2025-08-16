export const metadata = {
  title: 'CineChat',
  description: 'Анонимные обсуждения фильмов/сериалов',
};

import '../styles/globals.css';
import Link from 'next/link';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 overflow-x-hidden">
        <div className="sticky top-0 z-50 backdrop-blur bg-zinc-950/80 border-b border-zinc-800">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <Link href="/" className="flex items-center gap-3 select-none">
              <span className="text-xl font-bold">🎬 CineChat</span>
              <span className="text-sm text-zinc-400">Анонимные обсуждения</span>
            </Link>
          </div>
        </div>
        <div className="max-w-6xl mx-auto p-4">{children}</div>
      </body>
    </html>
  );
}
