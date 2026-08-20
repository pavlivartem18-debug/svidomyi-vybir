import { useState } from 'react';
import { useLang } from '../context.jsx';

const WEEKDAYS_UK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
const WEEKDAYS_EN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS_UK = ['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const dayKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function Calendar({ events = [], selected, onSelect }) {
  const { lang } = useLang();
  const today = new Date();
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const byDay = {};
  for (const e of events) {
    const key = dayKey(new Date(e.startsAt));
    (byDay[key] ??= []).push(e);
  }

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDay = new Date(year, month, 1);
  const offset = (firstDay.getDay() + 6) % 7; // понеділок — перший день
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const weekdays = lang === 'uk' ? WEEKDAYS_UK : WEEKDAYS_EN;
  const months = lang === 'uk' ? MONTHS_UK : MONTHS_EN;
  const selectedKey = selected ? dayKey(new Date(selected)) : null;
  const todayKey = dayKey(today);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setView(new Date(year, month - 1, 1))} className="rounded-lg px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-700">←</button>
        <p className="font-bold text-slate-900 dark:text-white">{months[month]} {year}</p>
        <button onClick={() => setView(new Date(year, month + 1, 1))} className="rounded-lg px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-700">→</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400">
        {weekdays.map((w) => <span key={w}>{w}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <span key={`empty-${i}`} />;
          const key = dayKey(date);
          const has = byDay[key]?.length > 0;
          const isToday = key === todayKey;
          const isSel = key === selectedKey;
          return (
            <button
              key={key}
              onClick={() => onSelect?.(has || isSel ? date : date)}
              className={`relative aspect-square rounded-lg text-sm transition hover:scale-110 hover:shadow-md ${
                isSel
                  ? 'bg-blue-600 text-white'
                  : isToday
                    ? 'border border-blue-500 font-bold text-blue-600 dark:text-blue-400'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700'
              } ${has && !isSel ? 'font-bold text-emerald-600 dark:text-emerald-400' : ''}`}
            >
              {date.getDate()}
              {has && (
                <span className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${isSel ? 'bg-white' : 'bg-emerald-500'}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
