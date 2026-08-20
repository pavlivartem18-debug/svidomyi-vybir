import { Link } from 'react-router-dom';

const variants = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  accent: 'bg-emerald-500 hover:bg-emerald-600 text-white',
  outline: 'border border-blue-600 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800',
  ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
};

export function Btn({ to, onClick, type = 'button', variant = 'primary', children, className = '', disabled }) {
  const cls = `btn-press inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`;
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
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[color]}`}>{children}</span>;
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
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 ${className}`}>
      {children}
    </div>
  );
}

export function Empty({ children }) {
  return <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">{children}</p>;
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="mb-6 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
      {tabs.map(([key, label]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition sm:px-4 ${
            active === key
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          {label}
        </button>
      ))}
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

export const fmtDate = (iso, lang = 'uk') =>
  new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'uk-UA', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

export const fmtDateTime = (iso, lang = 'uk') =>
  new Date(iso).toLocaleString(lang === 'en' ? 'en-GB' : 'uk-UA', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
