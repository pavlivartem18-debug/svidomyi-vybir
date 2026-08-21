import { useEffect, useRef, useState } from 'react';
import { api, imgUrl } from '../api.js';
import { useAuth, useLang } from '../context.jsx';
import { Alert } from '../components/ui.jsx';
import { useSeo } from '../seo.js';

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });

export default function Chat() {
  const { user } = useAuth();
  const { lang } = useLang();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [err, setErr] = useState(null);
  const [connected, setConnected] = useState(true);
  const listRef = useRef(null);
  const lastAtRef = useRef(null);
  const stickBottomRef = useRef(true);

  useSeo(lang === 'uk' ? 'Чат' : 'Chat', 'Чат членів молодіжного обʼєднання «Свідомий Вибір»');

  const scrollToBottom = (smooth = false) => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  };

  // перше завантаження
  useEffect(() => {
    api('/api/chat')
      .then((list) => {
        setMessages(list);
        if (list.length) lastAtRef.current = list[list.length - 1].at;
        setTimeout(() => scrollToBottom(), 50);
      })
      .catch((e) => setErr(e.message));
  }, []);

  // живе авто-оновлення кожні 4 секунди (лише нові повідомлення)
  useEffect(() => {
    const timer = setInterval(async () => {
      if (document.visibilityState !== 'visible') return; // не витрачаємо батарею у фоні
      try {
        const fresh = await api('/api/chat' + (lastAtRef.current ? `?after=${encodeURIComponent(lastAtRef.current)}` : ''));
        setConnected(true);
        if (fresh.length > 0) {
          lastAtRef.current = fresh[fresh.length - 1].at;
          setMessages((prev) => [...prev, ...fresh].slice(-300));
          if (stickBottomRef.current) setTimeout(() => scrollToBottom(true), 30);
        }
      } catch {
        setConnected(false);
      }
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    stickBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const send = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setErr(null);
    try {
      const msg = await api('/api/chat', { method: 'POST', body: { text: value } });
      setText('');
      lastAtRef.current = msg.at;
      setMessages((prev) => [...prev, msg]);
      stickBottomRef.current = true;
      setTimeout(() => scrollToBottom(true), 30);
    } catch (ex) {
      setErr(ex.message);
    }
  };

  const remove = async (id) => {
    try {
      await api(`/api/chat/${id}`, { method: 'DELETE' });
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch (ex) {
      setErr(ex.message);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col px-4 py-6">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
          💬 {lang === 'uk' ? 'Чат обʼєднання' : 'Organization chat'}
        </h1>
        <span className={`flex items-center gap-1.5 text-xs font-semibold ${connected ? 'text-emerald-500' : 'text-red-400'}`}>
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500 anim-pulse-dot' : 'bg-red-400'}`} />
          {connected ? (lang === 'uk' ? 'онлайн' : 'live') : (lang === 'uk' ? 'перепідключення...' : 'reconnecting...')}
        </span>
      </div>

      <div
        ref={listRef}
        onScroll={onScroll}
        className="shadow-soft flex-1 space-y-3 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700/60 dark:bg-slate-800"
      >
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-400">
            {lang === 'uk'
              ? 'Ще нічого не написано — привітайтеся першим! 👋'
              : 'No messages yet — say hi! 👋'}
          </p>
        )}
        {messages.map((m) => {
          const mine = m.userId === user.id;
          return (
            <div key={m.id} className={`anim-slide-down group flex gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}>
              {m.userAvatar ? (
                <img src={imgUrl(m.userAvatar)} alt="" loading="lazy" className="h-9 w-9 shrink-0 rounded-full object-cover" />
              ) : (
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${mine ? 'grad-accent-br' : 'bg-slate-400 dark:bg-slate-600'}`}>
                  {m.userName?.[0] || '👤'}
                </div>
              )}
              <div className={`max-w-[75%] ${mine ? 'items-end text-right' : ''} flex flex-col`}>
                <p className="mb-0.5 px-1 text-[11px] font-bold text-slate-400">
                  {mine ? (lang === 'uk' ? 'Ви' : 'You') : m.userName}
                  {m.userRole === 'admin' && ' ⭐'}
                  <span className="ml-1.5 font-normal">{fmtTime(m.at)}</span>
                </p>
                <div
                  className={`group/msg relative whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-snug ${
                    mine
                      ? 'grad-accent-bg rounded-br-sm text-white'
                      : 'rounded-bl-sm bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100'
                  }`}
                >
                  {m.text}
                  {(mine || user.role === 'admin') && (
                    <button
                      onClick={() => remove(m.id)}
                      title={lang === 'uk' ? 'Видалити' : 'Delete'}
                      className={`absolute -top-2 ${mine ? '-left-2' : '-right-2'} hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow group-hover/msg:flex`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {err && <div className="mt-2"><Alert kind="error">{err}</Alert></div>}

      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={lang === 'uk' ? 'Написати повідомлення...' : 'Type a message...'}
          maxLength={500}
          className="shadow-soft flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="btn-press grad-accent-bg shadow-accent rounded-full px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"
        >
          ➤
        </button>
      </form>
      <p className="mt-1.5 text-center text-[11px] text-slate-400">
        {lang === 'uk'
          ? 'Чат для верифікованих членів обʼєднання · поважайте одне одного 💛'
          : 'Chat for verified members · be respectful 💛'}
      </p>
    </div>
  );
}
