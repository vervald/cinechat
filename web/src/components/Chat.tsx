'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import io from 'socket.io-client';

const SERVER = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';

type Msg = { id: string; movieId: number; parent_id?: string | null; content: string; created_at: number; handle: string };

export function Chat({ movieId }: { movieId: number }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const socketRef = useRef<any>(null);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showRootEmoji, setShowRootEmoji] = useState(false);
  const [showReplyEmoji, setShowReplyEmoji] = useState(false);
  const [sortMode, setSortMode] = useState<'new' | 'top'>('new');

  useEffect(() => {
    let active = true;
    (async () => {
      const r = await fetch(`${SERVER}/api/chat/${movieId}/messages`, { credentials: 'include' });
      const data = await r.json();
      if (!active) return;
      setMessages(data.messages || []);
      const socket = io(SERVER, { withCredentials: true });
      socketRef.current = socket;
      socket.emit('join', { movieId });
      socket.on('chat:new', (msg: Msg) => {
        if (msg.movieId === movieId) {
          setMessages(prev => [msg, ...prev]);
        }
      });
      socket.on('chat:vote', (p: any) => {
        setMessages(prev => prev.map(m => m.id === p.messageId ? ({ ...(m as any), score: p.score }) as any : m));
      });
    })();
    return () => { active = false; socketRef.current?.disconnect(); };
  }, [movieId]);

  async function sendRoot() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    await fetch(`${SERVER}/api/chat/${movieId}/messages`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text })
    });
  }

  async function sendReply(parentId: string) {
    const text = replyInput.trim();
    if (!text) return;
    setReplyInput('');
    setActiveReplyId(null);
    await fetch(`${SERVER}/api/chat/${movieId}/messages`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text, parentId })
    });
  }

  function buildThreadTree(msgs: Msg[], mode: 'new' | 'top') {
    const idToChildren = new Map<string, Msg[]>();
    const roots: Msg[] = [];
    for (const m of msgs) {
      const parentId = m.parent_id || null;
      if (parentId) {
        if (!idToChildren.has(parentId)) idToChildren.set(parentId, []);
        idToChildren.get(parentId)!.push(m);
      } else {
        roots.push(m);
      }
    }
    // keep original order within each group (messages is already sorted desc by created_at)
    if (mode === 'top') {
      roots.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
    }
    return { roots, idToChildren };
  }

  const threadMap = useMemo(() => buildThreadTree(messages, sortMode), [messages, sortMode]);

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const EMOJIS = ['😀','😁','😂','🤣','😊','😍','😎','🙌','👏','👍','🔥','💯','🎉','✨','🎬'];
  async function vote(messageId: string, value: 1 | -1) {
    await fetch(`${SERVER}/api/chat/${movieId}/messages/${messageId}/vote`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value })
    });
  }
  function appendEmojiToRoot(e: string) { setInput(prev => prev + e); }
  function appendEmojiToReply(e: string) { setReplyInput(prev => prev + e); }

  function renderMessage(msg: Msg, depth = 0) {
    const children = threadMap.idToChildren.get(msg.id) || [];
    return (
      <li
        key={msg.id}
        className="rounded-lg bg-zinc-950 ring-1 ring-zinc-800 p-3 w-full max-w-full"
        style={{ paddingLeft: 12 + depth * 16 }}
      >
        <div className="text-xs text-zinc-400">{new Date(msg.created_at).toLocaleString()} • {msg.handle}</div>
        {msg.parent_id && (
          <div className="text-[11px] text-zinc-500">В ответ на ветку</div>
        )}
        <div className="mt-1 whitespace-pre-wrap break-words">{msg.content}</div>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button aria-label="upvote" className="w-6 h-6 rounded-md bg-green-600 text-white flex items-center justify-center active:translate-y-px" onClick={()=>vote(msg.id, 1)}>
              <svg viewBox="0 0 24 24" className="w-3 h-3" aria-hidden="true"><path d="M12 5l7 12H5l7-12z" fill="currentColor"/></svg>
            </button>
            <span className="text-xs text-zinc-300 w-6 text-center" data-testid="score">{(msg as any).score ?? 0}</span>
            <button aria-label="downvote" className="w-6 h-6 rounded-md bg-red-600 text-white flex items-center justify-center active:-translate-y-px" onClick={()=>vote(msg.id, -1)}>
              <svg viewBox="0 0 24 24" className="w-3 h-3 rotate-180" aria-hidden="true"><path d="M12 5l7 12H5l7-12z" fill="currentColor"/></svg>
            </button>
          </div>
          <button
            type="button"
            className="text-xs text-zinc-400 hover:text-zinc-200"
            onClick={() => { setActiveReplyId(msg.id); setReplyInput(''); setShowReplyEmoji(false); }}
            data-testid="reply-btn"
          >
            Ответить
          </button>
          {children.length > 0 && (
            <button
              type="button"
              className="text-xs text-zinc-400 hover:text-zinc-200"
              onClick={() => toggleExpand(msg.id)}
            >
              {expandedIds.has(msg.id) ? `Свернуть ответы (${children.length})` : `Показать ответы (${children.length})`}
            </button>
          )}
        </div>
        {activeReplyId === msg.id && (
          <div className="mt-2 flex items-center gap-2" data-testid="inline-reply-box">
            <input
              value={replyInput}
              onChange={(e)=>setReplyInput(e.target.value)}
              onKeyDown={(e)=>{ if(e.key==='Enter') sendReply(msg.id); if(e.key==='Escape') setActiveReplyId(null); }}
              placeholder={`Ответ для ${msg.handle}…`}
              className="flex-1 min-w-0 rounded-lg bg-zinc-950 px-3 py-2 outline-none ring-1 ring-zinc-800 focus:ring-zinc-600"
            />
            <div className="relative">
              <button
                type="button"
                aria-label="emoji"
                className="rounded-md px-2 py-2 ring-1 ring-zinc-800 hover:bg-zinc-800"
                onClick={() => setShowReplyEmoji(v => !v)}
                data-testid="emoji-toggle-reply"
              >
                😊
              </button>
              {showReplyEmoji && (
                <div className="absolute right-0 mt-2 z-10 w-40 rounded-md bg-zinc-900 ring-1 ring-zinc-800 p-2 grid grid-cols-6 gap-1" data-testid="emoji-list-reply">
                  {EMOJIS.map(em => (
                    <button key={em} className="text-lg hover:bg-zinc-800 rounded" onClick={()=>appendEmojiToReply(em)} data-testid="emoji-item">{em}</button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={()=>sendReply(msg.id)}
              aria-label="Отправить"
              title="Отправить"
              className="rounded-full w-9 h-9 bg-zinc-200 text-zinc-900 flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                <path d="M2 21l21-9L2 3l5 9-5 9zm7-3l9-6-9-6v12z" fill="currentColor" />
              </svg>
            </button>
            <button
              onClick={()=>{ setActiveReplyId(null); setReplyInput(''); }}
              className="text-xs text-zinc-400 hover:text-zinc-200 whitespace-nowrap"
            >
              <span className="hidden sm:inline">Отмена</span>
              <span className="inline sm:hidden">Отм.</span>
            </button>
          </div>
        )}
        {children.length > 0 && expandedIds.has(msg.id) && (
          <ul className="space-y-3 mt-3">
            {children.map(child => renderMessage(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <section className="rounded-xl ring-1 ring-zinc-800 bg-zinc-900 p-4 w-full max-w-full overflow-x-hidden shadow-lg/10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-semibold">Чат</h2>
        <div className="flex items-center rounded-lg ring-1 ring-zinc-800 overflow-hidden text-xs">
          <button
            className={`px-2 py-1 ${sortMode==='new' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
            onClick={()=>setSortMode('new')}
            aria-pressed={sortMode==='new'}
          >
            По новизне
          </button>
          <button
            className={`px-2 py-1 ${sortMode==='top' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
            onClick={()=>setSortMode('top')}
            aria-pressed={sortMode==='top'}
          >
            По рейтингу
          </button>
        </div>
      </div>
      <div className="flex gap-2 mb-3">
        <input
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{ if(e.key==='Enter') sendRoot(); }}
          placeholder="Введите текст"
          className="flex-1 rounded-lg bg-zinc-950 px-3 py-2 outline-none ring-1 ring-zinc-800 focus:ring-zinc-600 min-w-0"
        />
        <div className="relative">
          <button
            type="button"
            aria-label="emoji"
            className="rounded-lg px-3 py-2 ring-1 ring-zinc-800 hover:bg-zinc-800"
            onClick={() => setShowRootEmoji(v => !v)}
            data-testid="emoji-toggle-root"
          >
            😊
          </button>
          {showRootEmoji && (
            <div className="absolute right-0 mt-2 z-10 w-48 rounded-md bg-zinc-900 ring-1 ring-zinc-800 p-2 grid grid-cols-6 gap-1" data-testid="emoji-list-root">
              {EMOJIS.map(em => (
                <button key={em} className="text-xl hover:bg-zinc-800 rounded" onClick={()=>appendEmojiToRoot(em)} data-testid="emoji-item">{em}</button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={sendRoot}
          aria-label="Отправить"
          title="Отправить"
          className="rounded-full w-10 h-10 bg-zinc-200 text-zinc-900 flex items-center justify-center"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
            <path d="M2 21l21-9L2 3l5 9-5 9zm7-3l9-6-9-6v12z" fill="currentColor" />
          </svg>
        </button>
      </div>
      <ul className="space-y-3 max-h-[60vh] overflow-auto pr-1 w-full max-w-full">
        {threadMap.roots.map(m => renderMessage(m, 0))}
      </ul>
    </section>
  );
}
