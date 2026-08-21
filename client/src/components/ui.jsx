import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const variants = {
  primary: 'btn-primary-grad shadow-accent hover:shadow-lg',
  accent: 'btn-accent-grad shadow-accent hover:shadow-lg',
  outline: 'border-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800',
  ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  danger: 'bg-gradient-to-r from-red-500 to-rose-500 text-white',
};

export function Btn({ to, onClick, type = 'button', variant = 'primary', children, className = '', disabled }) {
  const shine = ['primary', 'accent'].includes(variant) ? 'btn-shine' : '';
  const cls = `btn-press ${shine} inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`;
  if (to) return <Link to={to} className={cls}>{children}</Link>;
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600';

// children свідомо ігнорується: input — порожній елемент, і вкладені children
// падають при рендері (саме це ламало сторінку кабінету)
export function Field({ label, children, ...props }) {
  return (
    <label className="block text-sm">
      {label && <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">{label}</span>}
      <input {...props} />
    </label>
  );
}

export function TextArea({ label, rows = 4, ...props }) {
  return (
    <label className="block text-sm">
      {label && <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">{label}</span>}
      <textarea rows={rows} {...props} className={inputCls} />
    </label>
  );
}

export function Select({ label, options = [], ...props }) {
  return (
    <label className="block text-sm">
      {label && <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">{label}</span>}
      <select {...props} className={inputCls}>
        {options.map(([value, text]) => (
          <option key={value} value={value}>{text}</option>
        ))}
      </select>
    </label>
  );
}

export function Alert({ kind = 'info', children }) {
  const styles = {
    info: 'bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-blue-300',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-slate-800 dark:text-emerald-300',
    error: 'bg-red-50 text-red-700 dark:bg-slate-800 dark:text-red-300',
  };
  if (!children) return null;
  return <div className={`anim-slide-down rounded-lg px-4 py-3 text-sm ${styles[kind]}`}>{children}</div>;
}

export function Badge({ color = 'blue', children }) {
  const map = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300',
  };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${map[color]}`}>{children}</span>;
}

export function Section({ title, subtitle, children, actions }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Card({ children, className = '' }) {
  return (
    <div className={`shadow-soft rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-700/60 dark:bg-slate-800 ${className}`}>
      {children}
    </div>
  );
}

export function Empty({ children }) {
  return <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">{children}</p>;
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="shadow-soft -mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0 dark:border-slate-700/60">
      <div className="flex gap-1 rounded-2xl border border-slate-100 bg-white p-1.5 dark:bg-slate-800">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`btn-press shrink-0 whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
              active === key
                ? 'grad-accent-bg shadow-accent text-white'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Горизонтальна стовпчикова діаграма без зовнішніх бібліотек
export function BarChart({ data, suffix = '' }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={d.label} className="flex items-center gap-3 text-sm">
          <span className="w-20 shrink-0 text-slate-500 dark:text-slate-400">{d.label}</span>
          <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className="bar-grow h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400"
              style={{ width: `${(d.value / max) * 100}%`, transitionDelay: `${i * 80}ms` }}
            />
          </div>
          <span className="w-12 shrink-0 text-right font-bold text-slate-700 dark:text-slate-200">
            {d.value}{suffix}
          </span>
        </div>
      ))}
    </div>
  );
}

export const Stars = ({ value }) => (
  <span className="text-amber-400">{'★'.repeat(value)}{'☆'.repeat(5 - value)}</span>
);

/* Лічильник, що плавно накручується до значення */
export function CountUp({ value, duration = 1300, suffix = '' }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 4);
      setN(Math.round(eased * value));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{n}{suffix}</>;
}

/* 3D-нахил картки за курсором миші — з обмеженням до кадру анімації (без провисань) */
export function Tilt({ children, className = '', max = 7 }) {
  const ref = useRef(null);
  const raf = useRef(0);
  const onMove = (e) => {
    const ev = e;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = (ev.clientX - r.left) / r.width - 0.5;
      const y = (ev.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(800px) rotateY(${x * max}deg) rotateX(${-y * max}deg) translateY(-4px)`;
    });
  };
  const onLeave = () => {
    cancelAnimationFrame(raf.current);
    if (ref.current) ref.current.style.transform = '';
  };
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className={`tilt-card ${className}`}>
      {children}
    </div>
  );
}

/* Градієнтне кільце прогресу, що плавно заповнюється */
export function ProgressRing({ value, size = 120, stroke = 10, label }) {
  const [offset, setOffset] = useState(0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  useEffect(() => {
    const t = setTimeout(() => setOffset(c - (Math.min(100, value) / 100) * c), 150);
    return () => clearTimeout(t);
  }, [value, c]);
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" className="stroke-slate-100 dark:stroke-slate-700" />
        <circle
          cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" strokeLinecap="round"
          stroke="url(#ringGrad)" strokeDasharray={c} strokeDashoffset={offset}
          className="ring-draw"
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" class="ring-stop-a" />
            <stop offset="100%" class="ring-stop-b" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
          <CountUp value={value} />
        </span>
        {label && <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>}
      </div>
    </div>
  );
}

/* Ефект успіху: намальована галочка + конфеті */
export function SuccessFX({ text }) {
  const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  return (
    <div className="anim-pop relative mx-auto w-56 overflow-visible py-2 text-center">
      <svg className="mx-auto h-16 w-16" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r="24" fill="none" stroke="#10b981" strokeWidth="2.5" className="check-draw" />
        <path d="M15 27l7.5 7.5L37 19" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="check-draw" style={{ animationDelay: '0.25s' }} />
      </svg>
      {text && <p className="mt-1 font-bold text-emerald-600 dark:text-emerald-400">{text}</p>}
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${5 + i * 6.8}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 7) * 0.07}s`,
          }}
        />
      ))}
    </div>
  );
}

export const fmtDate = (iso, lang = 'uk') =>
  new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'uk-UA', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

export const fmtDateTime = (iso, lang = 'uk') =>
  new Date(iso).toLocaleString(lang === 'en' ? 'en-GB' : 'uk-UA', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
