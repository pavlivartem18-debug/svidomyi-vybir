import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth, useLang } from '../context.jsx';
import { Field, TextArea, Btn, Alert, Card } from '../components/ui.jsx';
import { interestCats } from '../i18n.js';

function AuthLayout({ title, children }) {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card>
        <h1 className="mb-6 text-center text-2xl font-extrabold text-slate-900 dark:text-white">{title}</h1>
        {children}
      </Card>
    </div>
  );
}

export function Login() {
  const { t, lang } = useLang();
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    try {
      const user = await login(form.email, form.password);
      nav(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (ex) {
      setErr(ex.message);
    }
  };

  return (
    <AuthLayout title={t('login')}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('email')} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Field label={t('password')} type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {err && <Alert kind="error">{err}</Alert>}
        <Btn type="submit" className="w-full">{t('login')}</Btn>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <Link to="/forgot-password" className="text-blue-600 hover:underline dark:text-blue-400">{t('forgot')}</Link>
        <Link to="/register" className="text-blue-600 hover:underline dark:text-blue-400">{t('nav.register')}</Link>
      </div>
      <p className="mt-4 rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-500 dark:bg-slate-900">
        {lang === 'uk'
          ? 'Демо-акаунти — адмін: admin@org.ua / Admin123! · заступник: deputy@org.ua / Deputy123! · член: demo@org.ua / Demo1234!'
          : 'Demo accounts — admin: admin@org.ua / Admin123! · deputy: deputy@org.ua / Deputy123! · member: demo@org.ua / Demo1234!'}
      </p>
    </AuthLayout>
  );
}

export function Register() {
  const { t, lang } = useLang();
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', surname: '', email: '', password: '', phone: '', about: '', birthday: '' });
  const [interests, setInterests] = useState([]);
  const [avatar, setAvatar] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggle = (key) =>
    setInterests((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const fd = new FormData();
      for (const [k, v] of Object.entries(form)) fd.append(k, v);
      fd.append('interests', interests);
      if (avatar) fd.append('avatar', avatar);
      await api('/api/auth/register', { method: 'POST', body: fd, isForm: true });
      // акаунт активний одразу — відразу входимо і ведемо в кабінет
      const user = await login(form.email, form.password);
      nav(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (ex) {
      setErr(ex.message);
      setBusy(false);
    }
  };

  return (
    <AuthLayout title={t('nav.register')}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('name')} required value={form.name} onChange={set('name')} />
          <Field label={lang === 'uk' ? 'Прізвище' : 'Surname'} value={form.surname} onChange={set('surname')} />
        </div>
        <Field label={t('email')} type="email" required value={form.email} onChange={set('email')} />
        <Field label={t('password')} type="password" required minLength={8} value={form.password} onChange={set('password')} />
        <Field label={t('phone')} value={form.phone} onChange={set('phone')} />
        <Field
          label={lang === 'uk' ? 'Дата народження (для вітань 🎂)' : 'Birthday (for greetings 🎂)'}
          type="date"
          value={form.birthday || ''}
          onChange={set('birthday')}
        />
        <TextArea label={lang === 'uk' ? 'Коротко про себе' : 'About you'} rows={3} value={form.about} onChange={set('about')} />
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">
            {lang === 'uk' ? 'Фотографія профілю' : 'Profile photo'}
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setAvatar(e.target.files[0])}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          />
        </label>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">{t('interests')}</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(interestCats[lang]).map(([key, label]) => (
              <button
                type="button"
                key={key}
                onClick={() => toggle(key)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  interests.includes(key)
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-300 text-slate-600 hover:border-blue-400 dark:border-slate-600 dark:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <Alert>
          {lang === 'uk'
            ? 'Після реєстрації ви одразу потрапите у кабінет. Статус «члена організації» (дозволяє голосувати й проходити опитування) призначає адміністратор після перевірки.'
            : 'After registration you get instant access. The “organization member” status (enables voting and surveys) is granted by the administrator after verification.'}
        </Alert>
        {err && <Alert kind="error">{err}</Alert>}
        <Btn type="submit" disabled={busy} className="w-full">
          {busy ? '…' : t('nav.register')}
        </Btn>
      </form>
      <p className="mt-4 text-center text-sm">
        <Link to="/login" className="text-blue-600 hover:underline dark:text-blue-400">{t('login')}</Link>
      </p>
    </AuthLayout>
  );
}

export function Forgot() {
  const { t, lang } = useLang();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState(null);
  const [resetUrl, setResetUrl] = useState(null);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    try {
      const res = await api('/api/auth/forgot', { method: 'POST', body: { email } });
      setMsg(res.message);
      setResetUrl(res.resetUrl);
    } catch (ex) {
      setErr(ex.message);
    }
  };

  return (
    <AuthLayout title={t('forgotTitle')}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('email')} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        {err && <Alert kind="error">{err}</Alert>}
        <Btn type="submit" className="w-full">{t('send')}</Btn>
      </form>
      {msg && <Alert kind="success">{msg}</Alert>}
      {resetUrl && (
        <div className="mt-3 text-sm">
          <p className="text-slate-500 dark:text-slate-400">
            {lang === 'uk' ? 'Посилання для скидання (прототип):' : 'Reset link (prototype):'}
          </p>
          <Link to={resetUrl.replace('http://localhost:5173', '')} className="break-all font-semibold text-blue-600 hover:underline dark:text-blue-400">
            {resetUrl}
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}

export function Reset() {
  const { token } = useParams();
  const { t } = useLang();
  const nav = useNavigate();
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    try {
      const res = await api(`/api/auth/reset/${token}`, { method: 'POST', body: { password } });
      setOk(res.message);
      setTimeout(() => nav('/login'), 1500);
    } catch (ex) {
      setErr(ex.message);
    }
  };

  return (
    <AuthLayout title={t('resetTitle')}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('password')} type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        {err && <Alert kind="error">{err}</Alert>}
        {ok && <Alert kind="success">{ok}</Alert>}
        <Btn type="submit" className="w-full">{t('save')}</Btn>
      </form>
    </AuthLayout>
  );
}

export function VerifyEmail() {
  const { token } = useParams();
  const { lang } = useLang();
  const [state, setState] = useState('loading');

  useEffect(() => {
    api(`/api/auth/verify/${token}`)
      .then(() => setState('ok'))
      .catch(() => setState('fail'));
  }, [token]);

  return (
    <AuthLayout title="Email">
      {state === 'loading' && <p className="text-center text-slate-400">…</p>}
      {state === 'ok' && (
        <div className="space-y-3 text-center">
          <p className="text-4xl">✅</p>
          <Alert kind="success">
            {lang === 'uk' ? 'Email підтверджено!' : 'Email verified!'}
          </Alert>
          <Link to="/login" className="block text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">
            {lang === 'uk' ? 'Увійти' : 'Log in'} →
          </Link>
        </div>
      )}
      {state === 'fail' && <Alert kind="error">{lang === 'uk' ? 'Посилання недійсне' : 'Invalid link'}</Alert>}
    </AuthLayout>
  );
}
