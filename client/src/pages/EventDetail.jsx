import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, imgUrl } from '../api.js';
import { useAuth, useLang } from '../context.jsx';
import { Btn, Badge, Alert, fmtDateTime } from '../components/ui.jsx';
import { eventCats } from '../i18n.js';

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t, lang } = useLang();
  const nav = useNavigate();
  const [event, setEvent] = useState(null);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const load = () =>
    api('/api/events/' + id)
      .then(setEvent)
      .catch((e) => setErr(e.message));

  useEffect(() => { load(); }, [id]);

  if (err) return <div className="mx-auto max-w-3xl px-4 py-10"><Alert kind="error">{err}</Alert></div>;
  if (!event) return <div className="py-10 text-center text-slate-400">…</div>;

  const register = async () => {
    setMsg(null); setErr(null);
    try {
      const res = await api(`/api/events/${event.id}/register`, { method: 'POST' });
      setMsg(res.message);
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const cancel = async () => {
    try {
      await api(`/api/events/${event.id}/register`, { method: 'DELETE' });
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const full = event.capacity > 0 && event.registeredCount >= event.capacity;
  const past = new Date(event.startsAt) < new Date();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Btn to="/events" variant="ghost" className="mb-4">← {t('nav.events')}</Btn>
      <div className="h-56 w-full overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-emerald-400">
        {event.image && <img src={imgUrl(event.image)} alt={event.title} className="h-full w-full object-cover" />}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Badge color="green">{eventCats[lang][event.category] || event.category}</Badge>
        <span className="text-sm text-slate-400">🕒 {fmtDateTime(event.startsAt, lang)}</span>
      </div>
      <h1 className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">{event.title}</h1>
      <p className="mt-4 whitespace-pre-line text-slate-600 dark:text-slate-300">{event.description}</p>

      <div className="mt-6 grid gap-3 rounded-xl border border-slate-200 p-5 text-sm dark:border-slate-700 sm:grid-cols-2">
        <p>📍 {event.location || '—'}</p>
        <p>
          👥 {lang === 'uk' ? 'Зареєстровано' : 'Registered'}: {event.registeredCount ?? 0}
          {event.capacity > 0 ? ` / ${event.capacity}` : ''}
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {msg && <Alert kind="success">{msg}</Alert>}
        {err && <Alert kind="error">{err}</Alert>}
        {!user ? (
          <Btn to="/login" variant="primary">{t('login')} → {t('registerEvent')}</Btn>
        ) : event.registered ? (
          <Btn onClick={cancel} variant="danger">{t('cancelRegistration')}</Btn>
        ) : past ? (
          <Alert>{lang === 'uk' ? 'Подія вже відбулася' : 'This event has already taken place'}</Alert>
        ) : full ? (
          <Alert kind="error">{lang === 'uk' ? 'Місця закінчилися' : 'No spots left'}</Alert>
        ) : (
          <Btn onClick={register} variant="accent">{t('registerEvent')}</Btn>
        )}
      </div>
    </div>
  );
}
