'use client';

import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const SERVER = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';

export function Rating({ movieId }: { movieId: number }) {
  const [mine, setMine] = useState<number | null>(null);
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);

  async function load() {
    const r = await fetch(`${SERVER}/api/rating/${movieId}`, { credentials: 'include' });
    const data = await r.json();
    setMine(data.mine);
    setAvg(data.average ? Math.round(data.average * 10) / 10 : 0);
    setCount(data.count || 0);
  }

  useEffect(() => {
    load();
    const socket = io(SERVER, { withCredentials: true });
    socket.emit('join', { movieId });
    socket.on('rating:update', (p: any) => {
      if (p.movieId === movieId) {
        setAvg(p.average ? Math.round(p.average * 10) / 10 : 0);
        setCount(p.count || 0);
      }
    });
    return () => { socket.disconnect(); };
  }, [movieId]);

  async function setRating(v: number) {
    await fetch(`${SERVER}/api/rating/${movieId}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: v })
    });
    await load();
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center text-amber-400" aria-label={`Средний рейтинг ${avg}`}>
          {Array.from({ length: 5 }).map((_, i) => {
            const filled = avg / 2 >= i + 1;
            const half = !filled && avg / 2 > i && avg / 2 < i + 1;
            return (
              <svg key={i} viewBox="0 0 24 24" className={`w-5 h-5 ${filled ? 'fill-current' : half ? '' : 'fill-transparent'} stroke-current`}>
                {half ? (
                  <defs>
                    <linearGradient id={`half-${i}`} x1="0" x2="100%">
                      <stop offset="50%" stopColor="currentColor" />
                      <stop offset="50%" stopColor="transparent" />
                    </linearGradient>
                  </defs>
                ) : null}
                <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.786 1.401 8.164L12 18.896 4.665 23.16l1.401-8.164L.132 9.21l8.2-1.192L12 .587z" fill={half ? `url(#half-${i})` : undefined} />
              </svg>
            );
          })}
        </div>
        <div className="text-sm text-zinc-300"><b>{avg}</b> ({count})</div>
      </div>
      <div className="flex gap-1 flex-wrap">
        {[...Array(10)].map((_, i) => {
          const v = i + 1;
          const active = mine === v;
          return (
            <button
              key={v}
              onClick={()=>setRating(v)}
              aria-label={`${v} из 10`}
              title={`${v} из 10`}
              className={`w-8 h-8 rounded-md text-sm ring-1 ring-zinc-800 ${active ? 'bg-amber-400 text-zinc-900 ring-amber-400' : 'bg-zinc-950 hover:bg-zinc-800'}`}
            >
              {v}
            </button>
          );
        })}
      </div>
    </div>
  );
}
