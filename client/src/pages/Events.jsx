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

  const visible = useMemo(() => {
    if (!selectedDay) return events;
    const key = dayKey(new Date(selectedDay));
    return events.filter((e) => dayKey(new Date(e.startsAt)) === key);
  }, [events, selectedDay]);

  const catOptions = [['', t('filter.all')], ...Object.entries(eventCats[lang])];

  return (
    <>
      <div className="bg-gradient-to-r from-blue-600 to-emerald-500 py-12 text-center text-white">
        <h1 className="text-3xl font-extrabold">{t('nav.events')}</h1>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[320px,1fr]">
        <aside className="space-y-4">
          <Calendar events={events} selected={selectedDay} onSelect={(d) => setSelectedDay(d)} />
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
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
              {visible.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
