'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const SERVER = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';

type Movie = { id: number; title: string; poster_path?: string; release_date?: string; };

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function loadTrending() {
    setLoading(true);
    const r = await fetch(`${SERVER}/api/search`, { credentials: 'include' });
    const data = await r.json();
    setResults((data.results || []).slice(0, 20));
    setLoading(false);
  }

  async function search(q: string) {
    setLoading(true);
    const r = await fetch(`${SERVER}/api/search?q=${encodeURIComponent(q)}`, { credentials: 'include' });
    const data = await r.json();
    setResults((data.results || []).filter((x:any)=>x.media_type === 'movie' || x.media_type === undefined).slice(0, 20));
    setLoading(false);
  }

  useEffect(() => { loadTrending(); }, []);

  // Debounced suggestions while typing
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      if (abortRef.current) abortRef.current.abort();
      return;
    }
    const handle = setTimeout(async () => {
      try {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setSuggestLoading(true);
        const r = await fetch(`${SERVER}/api/search?q=${encodeURIComponent(q)}`, {
          credentials: 'include',
          signal: controller.signal,
        });
        const data = await r.json();
        setSuggestions((data.results || []).filter((x:any)=>x.media_type === 'movie' || x.media_type === undefined).slice(0, 3));
      } catch {}
      finally { setSuggestLoading(false); }
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={e=>setQuery(e.target.value)}
          onKeyDown={e=>{ if(e.key==='Enter') search(query); }}
          placeholder="Найти фильм или сериал..."
          className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 outline-none ring-1 ring-zinc-800 focus:ring-zinc-600"
        />
        <button onClick={()=>search(query)} className="rounded-lg px-4 py-2 bg-zinc-200 text-zinc-900 font-medium">Искать</button>
      </div>

      {query.trim().length >= 2 && (suggestLoading || suggestions.length > 0) && (
        <div data-testid="suggestions" className="rounded-lg bg-zinc-900 ring-1 ring-zinc-800 divide-y divide-zinc-800 overflow-hidden">
          {suggestLoading && suggestions.length === 0 && (
            <div className="px-3 py-2 text-sm text-zinc-400">Поиск рекомендаций…</div>
          )}
          {suggestions.map(m => (
            <Link key={m.id} href={`/movie/${m.id}`} className="block px-3 py-2 hover:bg-zinc-800">
              <div className="flex items-center gap-3">
                <div className="shrink-0">
                  {m.poster_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w92${m.poster_path}`}
                      alt={String((m as any).title ?? (m as any).name ?? '')}
                      width={46}
                      height={69}
                      className="w-10 h-14 rounded-md object-cover"
                    />
                  ) : (
                    <div className="w-10 h-14 rounded-md bg-zinc-800" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate">{(m as any).title ?? (m as any).name}</div>
                  <div className="text-xs text-zinc-400">{(m.release_date || (m as any).first_air_date)?.slice(0,4) || ''}</div>
                </div>
              </div>
            </Link>
          ))}
          {(!suggestLoading && suggestions.length === 0) && (
            <div className="px-3 py-2 text-sm text-zinc-500">Ничего не найдено</div>
          )}
        </div>
      )}

      {loading && <div className="text-zinc-400">Загрузка...</div>}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 overflow-x-hidden">
        {results.map(m => (
          <Link key={m.id} href={`/movie/${m.id}`} className="block bg-zinc-900 rounded-xl overflow-hidden ring-1 ring-zinc-800 hover:ring-zinc-600">
            <div className="aspect-[2/3] bg-zinc-800" style={{backgroundImage: m.poster_path ? `url(https://image.tmdb.org/t/p/w342${m.poster_path})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center'}} />
            <div className="p-3">
              <div className="font-medium">{m.title}</div>
              <div className="text-xs text-zinc-400">{m.release_date?.slice(0,4) || ''}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
