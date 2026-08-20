import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useLang } from '../context.jsx';
import { Card, Empty, Btn, TextArea } from '../components/ui.jsx';
import { useSeo } from '../seo.js';

export default function Jobs() {
  const { lang } = useLang();
  const [jobs, setJobs] = useState(null);
  const [respondTo, setRespondTo] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  useSeo(lang === 'uk' ? 'Вакансії' : 'Jobs', 'Приєднуйтесь до команди «Свідомого Вибору»');

  useEffect(() => { api('/api/jobs').then(setJobs).catch(() => setJobs([])); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null); setErr(null);
    try {
      const res = await api('/api/contact', {
        method: 'POST',
        body: { ...form, subject: `Відгук на вакансію: ${respondTo.title}` },
      });
      setMsg(res.message);
      setRespondTo(null);
      setForm({ name: '', email: '', message: '' });
    } catch (ex) { setErr(ex.message); }
  };

  if (!jobs) return <div className="py-16 text-center text-slate-400">…</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
        {lang === 'uk' ? 'Вакансії та можливості' : 'Jobs & opportunities'}
      </h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {lang === 'uk' ? 'Приєднуйтесь до команди «Свідомого Вибору»!' : 'Join the Svidomyi Vybir team!'}
      </p>

      {msg && <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-slate-800 dark:text-emerald-300">{msg}</div>}
      {err && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-slate-800 dark:text-red-300">{err}</div>}

      {jobs.length === 0 ? (
        <div className="mt-6">
          <Empty>{lang === 'uk' ? 'Зараз активних вакансій немає — стежте за новинами!' : 'No open positions right now'}</Empty>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {jobs.map((j) => (
            <Card key={j.id}>
              <h3 className="font-bold text-slate-900 dark:text-white">{j.title}</h3>
              {j.description && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{j.description}</p>}
              {j.requirements && (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  <b>{lang === 'uk' ? 'Вимоги:' : 'Requirements:'}</b> {j.requirements}
                </p>
              )}
              {j.contact && <p className="mt-2 text-xs text-slate-400">📩 {j.contact}</p>}
              <Btn onClick={() => setRespondTo(j)} variant="accent" className="mt-3">
                {lang === 'uk' ? 'Відгукнутися' : 'Apply'} →
              </Btn>
            </Card>
          ))}
        </div>
      )}

      {respondTo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRespondTo(null)}>
          <Card className="w-full max-w-lg" >
            <div onClick={(e) => e.stopPropagation()}>
              <h3 className="mb-4 font-bold text-slate-900 dark:text-white">
                {lang === 'uk' ? 'Відгук:' : 'Apply:'} {respondTo.title}
              </h3>
              <form onSubmit={submit} className="space-y-3">
                <input required placeholder={lang === 'uk' ? 'Ваше імʼя' : 'Your name'} value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800" />
                <input required type="email" placeholder="Email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800" />
                <TextArea required label={lang === 'uk' ? 'Коротко про себе' : 'About you'} value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })} />
                <div className="flex gap-2">
                  <Btn type="submit">{lang === 'uk' ? 'Надіслати' : 'Send'}</Btn>
                  <Btn onClick={() => setRespondTo(null)} variant="ghost">{lang === 'uk' ? 'Скасувати' : 'Cancel'}</Btn>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
