'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Chat } from '@/components/Chat';
import { Rating } from '@/components/Rating';

const SERVER = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';

type Movie = { id: number; title: string; poster_path?: string; overview?: string; release_date?: string; };

export default function MoviePage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const [movie, setMovie] = useState<Movie | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch(`${SERVER}/api/movie/${id}`, { credentials: 'include' });
      const data = await r.json();
      setMovie(data);
    })();
  }, [id]);

  if (!movie) return <div className="text-zinc-400">Загрузка...</div>;

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        <div className="rounded-xl overflow-hidden ring-1 ring-zinc-800 bg-zinc-900 max-w-sm mx-auto md:max-w-none">
          <div className="hidden md:block">
            {movie.poster_path ? (
              <Image
                src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                alt={movie.title}
                width={500} height={750}
                className="w-full h-auto"
              />
            ) : <div className="aspect-[2/3] bg-zinc-800" />}
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-start gap-3 md:hidden">
              {movie.poster_path ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w154${movie.poster_path}`}
                  alt={movie.title}
                  width={92} height={138}
                  className="w-20 h-28 rounded-md object-cover"
                />
              ) : (
                <div className="w-20 h-28 rounded-md bg-zinc-800" />
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold truncate">{movie.title}</h1>
                <div className="text-sm text-zinc-400">{movie.release_date?.slice(0,4)}</div>
              </div>
            </div>
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
              <span>←</span>
              <span>На главную</span>
            </Link>
            <div className="mt-2 space-y-2 md:hidden">
              <h2 className="font-semibold">Описание</h2>
              <p className="text-sm text-zinc-300">
                {movie.overview || 'Описание отсутствует.'}
              </p>
            </div>
            <Rating movieId={movie.id} />
            <div className="mt-2 space-y-2">
              <h2 className="font-semibold hidden md:block">Описание</h2>
              <p className="text-sm text-zinc-300 hidden md:block">
                {movie.overview || 'Описание отсутствует.'}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="md:col-span-2 space-y-4">
        <Chat movieId={movie.id} />
      </div>
    </div>
  );
}
