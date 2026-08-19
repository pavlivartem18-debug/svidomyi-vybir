import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth, useLang, useTheme } from '../context.jsx';

export default function Navbar() {
  const { t, lang, setLang } = useLang();
  const { dark, toggle } = useTheme();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const links = [
    ['/', t('nav.home')],
    ['/about', t('nav.about')],
    ['/events', t('nav.events')],
    ['/news', t('nav.news')],
    ['/volunteer', t('nav.volunteer')],
    ['/contact', t('nav.contact')],
  ];

  const item = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-extrabold text-blue-600 dark:text-blue-400">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm text-white">СВ</span>
          {lang === 'uk' ? 'Свідомий Вибір' : 'Svidomyi Vybir'}
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} className={item} end={to === '/'}>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === 'uk' ? 'en' : 'uk')}
            className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            title={t('lang')}
          >
            {lang === 'uk' ? 'EN' : 'УКР'}
          </button>
          <button
            onClick={toggle}
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
            title={dark ? t('theme.light') : t('theme.dark')}
          >
            {dark ? '☀️' : '🌙'}
          </button>

          {user ? (
            <div className="hidden items-center gap-1 lg:flex">
              <NavLink to="/dashboard" className={item}>{t('nav.dashboard')}</NavLink>
              {user.role === 'admin' && (
                <NavLink to="/admin" className={item}>{t('nav.admin')}</NavLink>
              )}
              <button
                onClick={logout}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-1 lg:flex">
              <NavLink to="/login" className={item}>{t('nav.login')}</NavLink>
              <Link to="/register" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                {t('nav.register')}
              </Link>
            </div>
          )}

          <button className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden" onClick={() => setOpen(!open)}>
            ☰
          </button>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-slate-200 px-4 py-3 dark:border-slate-700 lg:hidden">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} className={item} onClick={() => setOpen(false)} end={to === '/'}>
              {label}
            </NavLink>
          ))}
          <hr className="my-2 border-slate-200 dark:border-slate-700" />
          {user ? (
            <>
              <NavLink to="/dashboard" className={item} onClick={() => setOpen(false)}>{t('nav.dashboard')}</NavLink>
              {user.role === 'admin' && (
                <NavLink to="/admin" className={item} onClick={() => setOpen(false)}>{t('nav.admin')}</NavLink>
              )}
              <button onClick={() => { logout(); setOpen(false); }} className="rounded-lg px-3 py-2 text-left text-sm font-medium text-red-500">
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={item} onClick={() => setOpen(false)}>{t('nav.login')}</NavLink>
              <NavLink to="/register" className={item} onClick={() => setOpen(false)}>{t('nav.register')}</NavLink>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
