import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, imgUrl } from '../api.js';
import { useAuth, useLang } from '../context.jsx';
import { Btn, Badge, fmtDate } from '../components/ui.jsx';
import { newsCats } from '../i18n.js';
import { useSeo } from '../seo.js';

function Comments({ newsId }) {
  const { user } = useAuth();
  const { lang } = useLang();
  const [items, setItems] = useState(null);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const load = () => api(`/api/news/${newsId}/comments`).then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, [newsId]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null); setErr(null);
    try {
      const c = await api(`/api/news/${newsId}/comments`, { method: 'POST', body: { text } });
      setText('');
      if (c.status === 'pending') setMsg(lang === 'uk' ? 'Коментар надіслано на модерацію' : 'Sent for moderation');
      load();
    } catch (ex) { setErr(ex.message); }
  };

  return (
    <section className="mt-10 border-t border-slate-200 pt-6 dark:border-slate-700">
      <h3 className="font-bold text-slate-900 dark:text-white">
        💬 {lang === 'uk' ? 'Коментарі' : 'Comments'} ({items?.length || 0})
      </h3>

      {user ? (
        <form onSubmit={submit} className="mt-3">
          <textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={lang === 'uk' ? 'Поділіться думкою...' : 'Share your thoughts...'}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          />
          {msg && <p className="mt-1 text-xs text-emerald-500">{msg}</p>}
          {err && <p className="mt-1 text-xs text-red-500">{err}</p>}
          <button className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            {lang === 'uk' ? 'Надіслати' : 'Post'}
          </button>
        </form>
      ) : (
        <p className="mt-2 text-sm text-slate-400">
          <Link to="/login" className="text-blue-600 hover:underline dark:text-blue-400">
            {lang === 'uk' ? 'Увійдіть' : 'Log in'}
          </Link>{' '}
          {lang === 'uk' ? 'щоб залишити коментар' : 'to leave a comment'}
        </p>
      )}

      {items && items.length > 0 && (
        <ul className="mt-4 space-y-3">
          {items.map((c) => (
            <li key={c.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
              <p className="font-semibold text-slate-800 dark:text-slate-100">
                {c.userName}
                <span className="ml-2 text-xs font-normal text-slate-400">{fmtDate(c.createdAt, lang)}</span>
              </p>
              <p className="mt-1 text-slate-600 dark:text-slate-300">{c.text}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function NewsDetail() {
  const { id } = useParams();
  const { lang, t } = useLang();
  const [news, setNews] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api('/api/news/' + id).then(setNews).catch((e) => setErr(e.message));
  }, [id]);

  useSeo(news?.title, news?.excerpt);

  if (err) return <div className="mx-auto max-w-3xl px-4 py-10 text-red-500">{err}</div>;
  if (!news) return <div className="py-10 text-center text-slate-400">…</div>;

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Btn to="/news" variant="ghost" className="mb-4">← {t('nav.news')}</Btn>
      <div className="h-64 w-full overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-emerald-400">
        {news.image && <img src={imgUrl(news.image)} alt={news.title} loading="lazy" className="h-full w-full object-cover" />}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Badge color="blue">{newsCats[lang][news.category] || news.category}</Badge>
        <span className="text-sm text-slate-400">{fmtDate(news.createdAt, lang)}</span>
      </div>
      <h1 className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">{news.title}</h1>
      <p className="mt-1 text-sm text-slate-400">
        {lang === 'uk' ? 'Автор' : 'By'}: {news.authorName}
      </p>
      <div className="mt-5 whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-200">
        {news.content || news.excerpt}
      </div>
      <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-200 pt-6 dark:border-slate-700">
        <Btn to="/news" variant="outline">{t('nav.news')}</Btn>
        <Btn to="/volunteer" variant="accent">{t('nav.volunteer')} 💚</Btn>
      </div>
      <Comments newsId={news.id} />
    </article>
  );
}
