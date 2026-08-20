import { Link } from 'react-router-dom';
import { Badge, fmtDateTime, fmtDate } from './ui.jsx';
import { useLang } from '../context.jsx';
import { eventCats, newsCats } from '../i18n.js';
import { imgUrl } from '../api.js';

export function NewsCard({ news }) {
  const { lang } = useLang();
  return (
    <article className="group hover-lift flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="h-44 w-full overflow-hidden bg-gradient-to-br from-blue-500 to-emerald-400">
        {news.image && (
          <img src={imgUrl(news.image)} alt={news.title} className="zoom-img h-full w-full object-cover" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <Badge color="blue">{newsCats[lang][news.category] || news.category}</Badge>
        <h3 className="mt-2 font-bold text-slate-900 dark:text-white">{news.title}</h3>
        <p className="mt-2 flex-1 text-sm text-slate-500 dark:text-slate-400">{news.excerpt}</p>
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span>{fmtDate(news.createdAt, lang)}</span>
          <Link to={`/news/${news.id}`} className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
            {useLang().t('readMore')} →
          </Link>
        </div>
      </div>
    </article>
  );
}

export function EventCard({ event, compact = false }) {
  const { lang, t } = useLang();
  const d = new Date(event.startsAt);
  return (
    <article className="hover-lift flex h-full gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-blue-600 text-white transition-transform duration-300 group-hover:scale-105">
        <span className="text-2xl font-extrabold leading-none">{d.getDate()}</span>
        <span className="text-[10px] uppercase">
          {d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'uk-UA', { month: 'short' })}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <Badge color="green">{eventCats[lang][event.category] || event.category}</Badge>
        <h3 className="mt-1.5 font-bold text-slate-900 dark:text-white">{event.title}</h3>
        {!compact && <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{event.description}</p>}
        <p className="mt-2 text-xs text-slate-400">
          🕒 {fmtDateTime(event.startsAt, lang)}
          {event.location ? ` · 📍 ${event.location}` : ''}
          {event.capacity > 0 ? ` · 👥 ${event.registeredCount ?? 0}/${event.capacity}` : ''}
        </p>
        <Link to={`/events/${event.id}`} className="mt-3 inline-block text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">
          {t('details')} →
        </Link>
      </div>
    </article>
  );
}
