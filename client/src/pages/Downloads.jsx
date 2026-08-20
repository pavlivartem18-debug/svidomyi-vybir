import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth, useLang } from '../context.jsx';
import { Field, TextArea, Btn, Card, Alert, Empty, fmtDate } from '../components/ui.jsx';

const fmtSize = (bytes) => {
  if (!bytes) return '';
  if (bytes > 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' МБ';
  if (bytes > 1024) return Math.round(bytes / 1024) + ' КБ';
  return bytes + ' Б';
};

export default function Downloads() {
  const { user } = useAuth();
  const { lang, t } = useLang();
  const [docs, setDocs] = useState(null);
  const [form, setForm] = useState({ title: '', description: '' });
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const isStaff = ['admin', 'deputy'].includes(user?.role);
  const load = () => api('/api/documents').then(setDocs).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null); setErr(null);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      if (file) fd.append('file', file);
      await api('/api/documents', { method: 'POST', body: fd, isForm: true });
      setMsg(lang === 'uk' ? 'Документ опубліковано' : 'Document published');
      setForm({ title: '', description: '' });
      setFile(null);
      setShowForm(false);
      load();
    } catch (ex) { setErr(ex.message); }
  };

  const remove = async (id) => {
    if (!confirm(lang === 'uk' ? 'Видалити документ?' : 'Delete document?')) return;
    await api(`/api/documents/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <>
      <div className="bg-gradient-to-r from-blue-600 to-emerald-500 py-12 text-center text-white">
        <h1 className="text-3xl font-extrabold">{t('nav.downloads')}</h1>
        <p className="mt-2 text-sm text-blue-50">
          {lang === 'uk'
            ? 'Положення, звіти, форми та інші документи організації'
            : 'Regulations, reports, forms and other organization documents'}
        </p>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-10">
        {isStaff && (
          <div className="mb-6">
            {!showForm ? (
              <Btn onClick={() => setShowForm(true)} variant="accent">
                + {lang === 'uk' ? 'Завантажити документ' : 'Upload document'}
              </Btn>
            ) : (
              <Card>
                <form onSubmit={submit} className="space-y-3">
                  <Field
                    label={lang === 'uk' ? 'Назва' : 'Title'}
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                  <TextArea
                    label={lang === 'uk' ? 'Опис (необовʼязково)' : 'Description (optional)'}
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">
                      {lang === 'uk' ? 'Файл (PDF, Word, Excel, зображення, ZIP — до 20 МБ)' : 'File (PDF, Word, Excel, images, ZIP — up to 20 MB)'}
                    </span>
                    <input
                      type="file"
                      required
                      onChange={(e) => setFile(e.target.files[0])}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                    />
                  </label>
                  {err && <Alert kind="error">{err}</Alert>}
                  <div className="flex gap-2">
                    <Btn type="submit">{t('send')}</Btn>
                    <Btn onClick={() => setShowForm(false)} variant="ghost">{t('cancel')}</Btn>
                  </div>
                </form>
              </Card>
            )}
          </div>
        )}

        {msg && <Alert kind="success">{msg}</Alert>}

        {!docs ? (
          <p className="text-center text-slate-400">…</p>
        ) : docs.length === 0 ? (
          <Empty>
            {lang === 'uk'
              ? 'Документів поки немає. Адміністратор може завантажити їх кнопкою вище.'
              : 'No documents yet. The administrator can upload them with the button above.'}
          </Empty>
        ) : (
          <ul className="space-y-3">
            {docs.map((d) => (
              <li key={d.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3 !p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="text-3xl">{d.icon}</span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-900 dark:text-white">{d.title}</p>
                      {d.description && (
                        <p className="truncate text-sm text-slate-500 dark:text-slate-400">{d.description}</p>
                      )}
                      <p className="text-xs text-slate-400">
                        {d.filename} · {fmtSize(d.size)} · {fmtDate(d.createdAt, lang)}
                        {d.uploadedBy ? ` · ${d.uploadedBy}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <a
                      href={d.path}
                      download={d.filename}
                      className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      ⬇ {lang === 'uk' ? 'Скачати' : 'Download'}
                    </a>
                    {isStaff && (
                      <Btn onClick={() => remove(d.id)} variant="danger" className="!px-3 !py-2">🗑</Btn>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
