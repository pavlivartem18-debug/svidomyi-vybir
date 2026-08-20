import { useState } from 'react';
import { api } from '../api.js';
import { useLang } from '../context.jsx';
import { Field, TextArea, Btn, Alert, Card } from '../components/ui.jsx';

export default function Contact() {
  const { t, lang } = useLang();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null); setErr(null);
    try {
      const res = await api('/api/contact', { method: 'POST', body: form });
      setMsg(res.message);
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (ex) {
      setErr(ex.message);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-blue-600 to-emerald-500 py-12 text-center text-white">
        <h1 className="text-3xl font-extrabold">{t('nav.contact')}</h1>
      </div>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1fr,340px]">
        <Card>
          <form onSubmit={submit} className="space-y-4">
            <Field label={t('name')} required value={form.name} onChange={set('name')} />
            <Field label={t('email')} type="email" required value={form.email} onChange={set('email')} />
            <Field label={lang === 'uk' ? 'Тема' : 'Subject'} value={form.subject} onChange={set('subject')} />
            <TextArea label={lang === 'uk' ? 'Повідомлення' : 'Message'} required value={form.message} onChange={set('message')} />
            {msg && <Alert kind="success">{msg}</Alert>}
            {err && <Alert kind="error">{err}</Alert>}
            <Btn type="submit">{t('send')}</Btn>
          </form>
        </Card>

        <div className="space-y-4">
          <Card>
            <h3 className="mb-3 font-bold text-slate-900 dark:text-white">{t('footer.contact')}</h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li>✉️ info@sv-vybir.org.ua</li>
              <li>📞 +380 50 000 0000</li>
              <li>📍 {lang === 'uk' ? 'вул. Хрещатик 22, Київ' : '22 Khreshchatyk St, Kyiv'}</li>
              <li>🕘 {lang === 'uk' ? 'Пн–Пт, 9:00–18:00' : 'Mon–Fri, 9AM–6PM'}</li>
            </ul>
          </Card>
          <Card>
            <h3 className="mb-3 font-bold text-slate-900 dark:text-white">
              {lang === 'uk' ? 'Ми в соцмережах' : 'Social media'}
            </h3>
            <div className="flex flex-wrap gap-2 text-sm">
              <a className="rounded-lg bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-400 px-4 py-2 font-bold text-white shadow-lg transition-transform hover:scale-105" href="https://www.instagram.com/svidomyi_vybir/" target="_blank" rel="noreferrer">📷 @svidomyi_vybir</a>
              <a className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-2 font-bold text-white shadow-lg transition-transform hover:scale-105" href="https://www.facebook.com/share/1HF1zxmYbK/" target="_blank" rel="noreferrer">📘 Facebook</a>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              {lang === 'uk' ? 'Засновник обʼєднання: ' : 'Founder: '}
              <a href="https://www.instagram.com/agre.sir/" target="_blank" rel="noreferrer" className="font-bold text-slate-600 hover:text-fuchsia-500 dark:text-slate-300">
                Влад Корженевський · @agre.sir 📷
              </a>
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
