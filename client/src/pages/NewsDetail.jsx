import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, imgUrl } from '../api.js';
import { useLang } from '../context.jsx';
import { Btn, Badge, fmtDate } from '../components/ui.jsx';
import { newsCats } from '../i18n.js';

export default function NewsDetail() {
  const { id } = useParams();
  const { lang, t } = useLang();
  const [news, setNews] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api('/api/news/' + id).then(setNews).catch((e) => setErr(e.message));
  }, [id]);

  if (err) return <div className="mx-auto max-w-3xl px-4 py-10 text-red-500">{err}</div>;
  if (!news) return <div className="py-10 text-center text-slate-400">…</div>;

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Btn to="/news" variant="ghost" className="mb-4">← {t('nav.news')}</Btn>
      <div className="h-64 w-full overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-emerald-400">
        {news.image && <img src={imgUrl(news.image)} alt={news.title} className="h-full w-full object-cover" />}
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
    </article>
  );
}
