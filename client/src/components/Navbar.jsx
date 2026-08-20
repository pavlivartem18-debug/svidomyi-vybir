import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth, useLang, useTheme } from '../context.jsx';
import { api } from '../api.js';

function NotificationsBell() {
  const { t, lang } = useLang();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const unread = items.filter((n) => !n.read).length;

  const load = () => api('/api/notifications').then(setItems).catch(() => {});
  useEffect(() => {
    load();
    const timer = setInterval(load, 60000); // оновлення кожну хвилину — «майже реальний час»
    return () => clearInterval(timer);
  }, []);

  const markAll = async () => {
    await api('/api/notifications/read-all', { method: 'POST' });
    load();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`relative rounded-lg border border-slate-300 px-2 py-1 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800 ${unread > 0 ? 'anim-wiggle' : ''}`}
        title={t('nav.notifications')}
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="anim-slide-down absolute right-0 z-50 mt-2 w-80 max-w-[90vw] rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900 dark:text-white">{t('nav.notifications')}</p>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">
                {lang === 'uk' ? 'Прочитати всі' : 'Mark all read'}
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">
              {lang === 'uk' ? 'Поки немає сповіщень' : 'No notifications yet'}
            </p>
          ) : (
            <ul className="max-h-80 space-y-1 overflow-y-auto">
              {items.slice(0, 12).map((n) => (
                <li key={n.id}>
                  <Link
                    to={n.link || '/dashboard'}
                    onClick={() => setOpen(false)}
                    className={`block rounded-lg px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${
                      n.read ? 'text-slate-500 dark:text-slate-400' : 'font-semibold text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {n.text}
                    <span className="mt-0.5 block text-[10px] text-slate-400">
                      {new Date(n.createdAt).toLocaleString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

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
    ['/downloads', t('nav.downloads')],
    ['/volunteer', t('nav.volunteer')],
    ['/contact', t('nav.contact')],
  ];
  const memberLinks = [
    ['/meetings', t('nav.meetings')],
    ['/surveys', t('nav.surveys')],
    ['/members', lang === 'uk' ? 'Каталог' : 'Directory'],
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
          {user && <NotificationsBell />}

          {user ? (
            <div className="hidden items-center gap-1 lg:flex">
              {memberLinks.map(([to, label]) => (
                <NavLink key={to} to={to} className={item}>{label}</NavLink>
              ))}
              <NavLink to="/dashboard" className={item}>{t('nav.dashboard')}</NavLink>
              {(user.role === 'admin' || user.role === 'deputy') && (
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
              {memberLinks.map(([to, label]) => (
                <NavLink key={to} to={to} className={item} onClick={() => setOpen(false)}>{label}</NavLink>
              ))}
              <NavLink to="/dashboard" className={item} onClick={() => setOpen(false)}>{t('nav.dashboard')}</NavLink>
              {(user.role === 'admin' || user.role === 'deputy') && (
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
