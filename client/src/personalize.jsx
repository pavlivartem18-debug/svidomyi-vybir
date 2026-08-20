import { createContext, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from './api.js';
import { useAuth, useLang, useTheme } from './context.jsx';

/* ============ Персоналізація інтерфейсу ============ */

export const ACCENTS = [
  { key: 'ukraine', label: 'Україна 💙💛', from: '#0057b7', to: '#eab308' },
  { key: 'ocean', label: 'Океан', from: '#2563eb', to: '#059669' },
  { key: 'indigo', label: 'Індіго', from: '#4f46e5', to: '#7c3aed' },
  { key: 'sunset', label: 'Захід', from: '#f59e0b', to: '#ef4444' },
  { key: 'rose', label: 'Троянда', from: '#ec4899', to: '#8b5cf6' },
  { key: 'forest', label: 'Ліс', from: '#059669', to: '#0d9488' },
  { key: 'graphite', label: 'Графіт', from: '#334155', to: '#64748b' },
];

export const BACKGROUNDS = [
  { key: 'none', label: 'Без фону', emoji: '⬜' },
  { key: 'aurora', label: 'Полярне сяйво', emoji: '🌌' },
  { key: 'stars', label: 'Зорі', emoji: '✨' },
  { key: 'bubbles', label: 'Бульбашки', emoji: '🫧' },
  { key: 'grid', label: 'Техно-сітка', emoji: '🕸️' },
  { key: 'waves', label: 'Хвилі', emoji: '🌊' },
];

const FONT_SCALES = { s: '15px', m: '16px', l: '18px' };
const DEFAULTS = { accent: 'ukraine', bg: 'aurora', fontScale: 'm', animLevel: 'full' };

const PersonalizeCtx = createContext();
export const usePersonalize = () => useContext(PersonalizeCtx);

function loadLocal() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('uiSettings') || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function PersonalizeProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState(loadLocal);

  // застосувати до документа
  useEffect(() => {
    const root = document.documentElement;
    const accent = ACCENTS.find((a) => a.key === settings.accent) || ACCENTS[0];
    root.style.setProperty('--accent-from', accent.from);
    root.style.setProperty('--accent-to', accent.to);
    root.style.fontSize = FONT_SCALES[settings.fontScale] || '16px';
    root.classList.remove('anim-lite', 'anim-off');
    if (settings.animLevel === 'lite') root.classList.add('anim-lite');
    if (settings.animLevel === 'off') root.classList.add('anim-off');
    // коли є анімований фон — тіло прозоре, базовий колір малює шар фону
    document.body.style.background = settings.bg !== 'none' ? 'transparent' : '';
    localStorage.setItem('uiSettings', JSON.stringify(settings));
  }, [settings]);

  // при вході беремо налаштування з акаунта, якщо вони там є
  const [syncedUser, setSyncedUser] = useState(null);
  useEffect(() => {
    if (user && user.id !== syncedUser) {
      setSyncedUser(user.id);
      if (user.uiSettings && Object.keys(user.uiSettings).length) {
        setSettings((s) => ({ ...s, ...user.uiSettings }));
      }
    }
    if (!user) setSyncedUser(null);
  }, [user, syncedUser]);

  const save = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    // зберігаємо в акаунт (якщо користувач увійшов) — тихо, без блокування
    if (user) api('/api/auth/me', { method: 'PUT', body: { uiSettings: next } }).catch(() => {});
    return next;
  };

  return (
    <PersonalizeCtx.Provider value={{ settings, save, reset: () => save(DEFAULTS) }}>
      {children}
    </PersonalizeCtx.Provider>
  );
}

/* ---------- Шар анімованого фону ---------- */
export function AnimatedBackground() {
  const { settings } = usePersonalize();

  if (settings.bg === 'none') return null;
  const cls = `bgfx bgfx-${settings.bg}`;

  return (
    <div className={cls} aria-hidden="true">
      {/* базовий колір під анімацією */}
      <div className="absolute inset-0 bg-white transition-colors dark:bg-slate-900" />
      {settings.bg === 'aurora' && (
        <>
          <i /><i /><i />
        </>
      )}
      {settings.bg === 'stars' && <Stars />}
      {settings.bg === 'bubbles' && <Bubbles />}
      {settings.bg === 'grid' && <div className="absolute inset-0" />}
      {settings.bg === 'waves' && (
        <>
          <svg viewBox="0 0 2880 200" preserveAspectRatio="none">
            <path d="M0,100 C240,160 480,40 720,90 C960,140 1200,60 1440,100 C1680,140 1920,60 2160,100 C2400,140 2640,60 2880,100 L2880,200 L0,200 Z" fill="var(--accent-from)" />
          </svg>
          <svg viewBox="0 0 2880 200" preserveAspectRatio="none">
            <path d="M0,120 C240,60 480,160 720,110 C960,60 1200,150 1440,110 C1680,70 1920,150 2160,110 C2400,70 2640,150 2880,120 L2880,200 L0,200 Z" fill="var(--accent-to)" />
          </svg>
        </>
      )}
    </div>
  );
}

function Stars() {
  // на маленьких екранах менше елементів — плавність на телефонах
  const count = typeof window !== 'undefined' && window.innerWidth < 640 ? 40 : 70;
  const [stars] = useState(() =>
    Array.from({ length: count }).map(() => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 1.5 + Math.random() * 2.5,
      delay: Math.random() * 3.2,
      dur: 2.2 + Math.random() * 2.6,
    }))
  );
  return (
    <>
      {stars.map((s, i) => (
        <i key={i} style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` }} />
      ))}
    </>
  );
}

function Bubbles() {
  const count = typeof window !== 'undefined' && window.innerWidth < 640 ? 9 : 16;
  const [bubbles] = useState(() =>
    Array.from({ length: count }).map(() => ({
      left: Math.random() * 100,
      size: 40 + Math.random() * 120,
      dur: 14 + Math.random() * 16,
      delay: Math.random() * 14,
    }))
  );
  return (
    <>
      {bubbles.map((b, i) => (
        <i key={i} style={{ left: `${b.left}%`, width: b.size, height: b.size, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` }} />
      ))}
    </>
  );
}

/* ---------- Панель налаштувань ---------- */
export function SettingsModal({ onClose }) {
  const { settings, save, reset } = usePersonalize();
  const { lang } = useLang();

  const label = (uk, en) => (lang === 'uk' ? uk : en);

  // блокуємо скрол фону, поки панель відкрита
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // портал у body: шапка має backdrop-filter, який ламає fixed-позиціонування на мобільних
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="anim-slide-down max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl dark:bg-slate-800 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
            🎨 {label('Оформлення сайту', 'Site appearance')}
          </h3>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-700">✕</button>
        </div>

        <p className="mb-6 text-xs text-slate-400">
          {label('Налаштування зберігаються у вашому акаунті та переносяться на всі пристрої.', 'Settings are saved to your account and sync across devices.')}
        </p>

        {/* Колір */}
        <p className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">{label('Акцентний колір', 'Accent color')}</p>
        <div className="mb-6 grid grid-cols-6 gap-2">
          {ACCENTS.map((a) => (
            <button
              key={a.key}
              onClick={() => save({ accent: a.key })}
              title={a.label}
              className={`h-11 rounded-xl transition-transform duration-200 hover:scale-110 ${settings.accent === a.key ? 'ring-4 ring-offset-2 ring-slate-400 dark:ring-offset-slate-800' : ''}`}
              style={{ background: `linear-gradient(135deg, ${a.from}, ${a.to})` }}
            />
          ))}
        </div>

        {/* Фон */}
        <p className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">{label('Анімований фон', 'Animated background')}</p>
        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {BACKGROUNDS.map((b) => (
            <button
              key={b.key}
              onClick={() => save({ bg: b.key })}
              className={`rounded-xl border-2 px-3 py-3 text-sm font-semibold transition ${
                settings.bg === b.key
                  ? 'border-transparent text-white shadow-accent'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:text-slate-300'
              }`}
              style={settings.bg === b.key ? { background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' } : {}}
            >
              {b.emoji} {b.label}
            </button>
          ))}
        </div>

        {/* Шрифт */}
        <p className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">{label('Розмір тексту', 'Text size')}</p>
        <div className="mb-6 grid grid-cols-3 gap-2">
          {[
            ['s', label('Дрібний', 'Small'), 'A'],
            ['m', label('Звичайний', 'Medium'), 'A'],
            ['l', label('Великий', 'Large'), 'A'],
          ].map(([key, name, icon]) => (
            <button
              key={key}
              onClick={() => save({ fontScale: key })}
              className={`rounded-xl border-2 py-2.5 font-bold transition ${
                settings.fontScale === key
                  ? 'border-transparent text-white shadow-accent'
                  : 'border-slate-200 text-slate-600 dark:border-slate-600 dark:text-slate-300'
              } ${key === 's' ? 'text-sm' : key === 'l' ? 'text-lg' : 'text-base'}`}
              style={settings.fontScale === key ? { background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' } : {}}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Анімації */}
        <p className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">{label('Рівень анімацій', 'Animation level')}</p>
        <div className="mb-6 grid grid-cols-3 gap-2">
          {[
            ['full', label('Повні', 'Full'), '✨'],
            ['lite', label('Менше', 'Lite'), '🎋'],
            ['off', label('Вимкнені', 'Off'), '🧊'],
          ].map(([key, name, icon]) => (
            <button
              key={key}
              onClick={() => save({ animLevel: key })}
              className={`rounded-xl border-2 py-2.5 text-sm font-bold transition ${
                settings.animLevel === key
                  ? 'border-transparent text-white shadow-accent'
                  : 'border-slate-200 text-slate-600 dark:border-slate-600 dark:text-slate-300'
              }`}
              style={settings.animLevel === key ? { background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' } : {}}
            >
              {icon} {name}
            </button>
          ))}
        </div>

        <button
          onClick={() => { reset(); }}
          className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          ↺ {label('Скинути до стандартних', 'Reset to defaults')}
        </button>
      </div>
    </div>, document.body);
}
