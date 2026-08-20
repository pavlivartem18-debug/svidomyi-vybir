import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useLang } from '../context.jsx';
import { Select, Empty } from '../components/ui.jsx';
import { EventCard } from '../components/Cards.jsx';
import Calendar from '../components/Calendar.jsx';
import { eventCats } from '../i18n.js';

const dayKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function Events() {
  const { t, lang } = useLang();
  const [events, setEvents] = useState([]);
  const [category, setCategory] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upcoming');

  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (from) params.set('from', new Date(from).toISOString());
    if (to) params.set('to', new Date(to + 'T23:59:59').toISOString());
    setLoading(true);
    api('/api/events?' + params.toString())
      .then(setEvents)
      .finally(() => setLoading(false));
  }, [category, from, to]);

  const now = new Date().toISOString();
  const upcoming = useMemo(
    () => events.filter((e) => e.startsAt >= now).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [events]
  );
  const past = useMemo(
    () => events.filter((e) => e.startsAt < now).sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
    [events]
  );

  const visible = useMemo(() => {
    const list = tab === 'upcoming' ? upcoming : past;
    if (!selectedDay) return list;
    const key = dayKey(new Date(selectedDay));
    return list.filter((e) => dayKey(new Date(e.startsAt)) === key);
  }, [tab, upcoming, past, selectedDay]);

  const catOptions = [['', t('filter.all')], ...Object.entries(eventCats[lang])];
  const tabCls = (active) =>
    `rounded-full px-5 py-2 text-sm font-bold transition ${
      active
        ? 'grad-accent-bg text-white shadow-accent'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
    }`;

  return (
    <>
      <div className="grad-accent-br py-12 text-center text-white">
        <h1 className="text-3xl font-extrabold">{t('nav.events')}</h1>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[320px,1fr]">
        <aside className="space-y-4">
          <Calendar events={upcoming} selected={selectedDay} onSelect={(d) => setSelectedDay(d)} />
          <div className="shadow-soft space-y-3 rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700/60 dark:bg-slate-800">
            <Select label={t('filter.category')} options={catOptions} value={category} onChange={(e) => setCategory(e.target.value)} />
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">{t('filter.from')}</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">{t('filter.to')}</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800" />
            </label>
            {(category || from || to || selectedDay) && (
              <button
                onClick={() => { setCategory(''); setFrom(''); setTo(''); setSelectedDay(null); }}
                className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                {t('cancel')} ✕
              </button>
            )}
          </div>
        </aside>

        <div>
          <div className="mb-5 flex gap-2">
            <button onClick={() => setTab('upcoming')} className={tabCls(tab === 'upcoming')}>
              🗓️ {lang === 'uk' ? `Майбутні (${upcoming.length})` : `Upcoming (${upcoming.length})`}
            </button>
            <button onClick={() => setTab('past')} className={tabCls(tab === 'past')}>
              📜 {lang === 'uk' ? `Минулі (${past.length})` : `Past (${past.length})`}
            </button>
          </div>
          {selectedDay && (
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              {new Date(selectedDay).toLocaleDateString(lang === 'en' ? 'en-GB' : 'uk-UA', { day: 'numeric', month: 'long' })}: {visible.length}
            </p>
          )}
          {loading ? (
            <Empty>…</Empty>
          ) : visible.length === 0 ? (
            <Empty>{lang === 'uk' ? 'Подій не знайдено' : 'No events found'}</Empty>
          ) : (
            <div className="grid gap-4">
              {visible.map((e, i) => (
                <div key={e.id} className="anim-fade-up" style={{ animationDelay: `${i * 0.07}s` }}>
                  <EventCard event={e} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
