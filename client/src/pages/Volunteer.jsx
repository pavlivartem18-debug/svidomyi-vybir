import { useState } from 'react';
import { api } from '../api.js';
import { useLang } from '../context.jsx';
import { Field, TextArea, Btn, Alert, Card } from '../components/ui.jsx';
import { interestCats } from '../i18n.js';

export default function Volunteer() {
  const { t, lang } = useLang();
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [areas, setAreas] = useState([]);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const toggleArea = (a) =>
    setAreas((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null); setErr(null);
    try {
      const res = await api('/api/volunteer', { method: 'POST', body: { ...form, areas } });
      setMsg(res.message);
      setForm({ name: '', email: '', phone: '', message: '' });
      setAreas([]);
    } catch (ex) {
      setErr(ex.message);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-emerald-500 to-blue-600 py-12 text-center text-white">
        <h1 className="text-3xl font-extrabold">{t('nav.volunteer')}</h1>
      </div>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1fr,340px]">
        <Card>
          <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">
            {lang === 'uk' ? 'Заповніть анкету волонтера' : 'Fill in the volunteer form'}
          </h2>
          <form onSubmit={submit} className="space-y-4">
            <Field label={t('name')} required value={form.name} onChange={set('name')} />
            <Field label={t('email')} type="email" required value={form.email} onChange={set('email')} />
            <Field label={t('phone')} value={form.phone} onChange={set('phone')} />

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                {lang === 'uk' ? 'Напрями діяльності' : 'Areas of interest'}
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(interestCats[lang]).map(([key, label]) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => toggleArea(key)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      areas.includes(key)
                        ? 'bg-emerald-500 text-white'
                        : 'border border-slate-300 text-slate-600 hover:border-emerald-400 dark:border-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <TextArea label={lang === 'uk' ? 'Повідомлення (необовʼязково)' : 'Message (optional)'} value={form.message} onChange={set('message')} />
            {msg && <Alert kind="success">{msg}</Alert>}
            {err && <Alert kind="error">{err}</Alert>}
            <Btn type="submit" variant="accent">{t('send')} 💚</Btn>
          </form>
        </Card>

        <div className="space-y-4">
          <Card>
            <h3 className="font-bold text-slate-900 dark:text-white">
              {lang === 'uk' ? 'Як це працює' : 'How it works'}
            </h3>
            <ol className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li>1. {lang === 'uk' ? 'Ви залишаєте заявку' : 'You submit the form'}</li>
              <li>2. {lang === 'uk' ? 'Ми звʼяжемося з вами протягом 3 днів' : 'We contact you within 3 days'}</li>
              <li>3. {lang === 'uk' ? 'Обираєте зручні події у календарі' : 'You pick convenient events in the calendar'}</li>
            </ol>
          </Card>
          <Card>
            <h3 className="font-bold text-slate-900 dark:text-white">
              {lang === 'uk' ? 'Що отримуєте ви' : 'What you get'}
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li>💚 {lang === 'uk' ? 'Новий досвід і знайомства' : 'New experience and connections'}</li>
              <li>📜 {lang === 'uk' ? 'Волонтерську книжку' : 'A volunteer book'}</li>
              <li>😊 {lang === 'uk' ? 'Вдячність від громади' : 'Community gratitude'}</li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
