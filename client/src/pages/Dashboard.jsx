import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth, useLang } from '../context.jsx';
import { Field, Btn, Alert, Card, fmtDateTime, Empty, Badge } from '../components/ui.jsx';
import { interestCats } from '../i18n.js';

export default function Dashboard() {
  const { user, updateProfile } = useAuth();
  const { t, lang } = useLang();
  const [dash, setDash] = useState(null);
  const [form, setForm] = useState({ name: user.name, phone: user.phone });
  const [interests, setInterests] = useState(user.interests || []);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const loadDash = () => api('/api/dashboard').then(setDash);
  useEffect(() => { loadDash(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggle = (key) =>
    setInterests((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));

  const save = async (e) => {
    e.preventDefault();
    setMsg(null); setErr(null);
    try {
      const payload = { ...form, interests };
      if (pw.newPassword) {
        payload.currentPassword = pw.currentPassword;
        payload.newPassword = pw.newPassword;
      }
      await updateProfile(payload);
      setPw({ currentPassword: '', newPassword: '' });
      setMsg(lang === 'uk' ? 'Профіль оновлено' : 'Profile updated');
    } catch (ex) {
      setErr(ex.message);
    }
  };

  const cancelReg = async (eventId) => {
    await api(`/api/events/${eventId}/register`, { method: 'DELETE' });
    loadDash();
  };

  const subscribe = async () => {
    await api('/api/newsletter/subscribe', { method: 'POST', body: { email: user.email } });
    loadDash();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
        {t('nav.dashboard')} — {user.name} <Badge color={user.role === 'admin' ? 'green' : 'blue'}>{user.role}</Badge>
      </h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        {/* Профіль */}
        <Card>
          <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">{t('dashboard.profile')}</h2>
          <form onSubmit={save} className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">{t('email')}</span>
              <input disabled value={user.email} className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-400 dark:border-slate-700 dark:bg-slate-900" />
            </label>
            <Field label={t('name')} value={form.name} onChange={set('name')} />
            <Field label={t('phone')} value={form.phone} onChange={set('phone')} />

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">{t('interests')}</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(interestCats[lang]).map(([key, label]) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => toggle(key)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                      interests.includes(key)
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <details className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <summary className="cursor-pointer text-sm font-medium">
                {lang === 'uk' ? 'Змінити пароль' : 'Change password'}
              </summary>
              <div className="mt-3 space-y-3">
                <Field label={lang === 'uk' ? 'Поточний пароль' : 'Current password'} type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
                <Field label={lang === 'uk' ? 'Новий пароль' : 'New password'} type="password" minLength={8} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
              </div>
            </details>

            {msg && <Alert kind="success">{msg}</Alert>}
            {err && <Alert kind="error">{err}</Alert>}
            <Btn type="submit">{t('save')}</Btn>
          </form>
        </Card>

        {/* Мої події + розсилка */}
        <div className="space-y-6">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('dashboard.events')}</h2>
              <Link to="/events" className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">
                + {t('nav.events')}
              </Link>
            </div>
            {!dash ? (
              <p className="text-slate-400">…</p>
            ) : dash.registrations.length === 0 ? (
              <Empty>{t('dash.noEvents')}</Empty>
            ) : (
              <ul className="space-y-3">
                {dash.registrations.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                    <div>
                      <Link to={`/events/${r.event.id}`} className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
                        {r.event.title}
                      </Link>
                      <p className="text-xs text-slate-400">🕒 {fmtDateTime(r.event.startsAt, lang)}</p>
                    </div>
                    <Btn onClick={() => cancelReg(r.eventId)} variant="danger" className="!px-3 !py-1 text-xs">
                      {t('cancelRegistration')}
                    </Btn>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('home.newsletter')}</h2>
            {dash?.subscribed ? (
              <Alert kind="success">{lang === 'uk' ? 'Ви підписані на розсилку ✅' : 'You are subscribed ✅'}</Alert>
            ) : (
              <div className="mt-3">
                <Btn onClick={subscribe} variant="accent">{t('subscribe')}</Btn>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
