import { useEffect } from 'react';
import { api } from './api.js';

// SEO: заголовок + опис для кожної сторінки + Open Graph
export function useSeo(title, description) {
  useEffect(() => {
    document.title = title ? `${title} — Свідомий Вибір` : 'Молодіжне обʼєднання «Свідомий Вибір»';
    setMeta('description', description || 'Платформа молодіжного обʼєднання «Свідомий Вибір»: новини, події, засідання, голосування.');
    setMeta('og:title', title || 'Молодіжне обʼєднання «Свідомий Вибір»', true);
    setMeta('og:description', description || 'Платформа молодіжного обʼєднання', true);
    setMeta('og:type', 'website', true);
  }, [title, description]);
}

function setMeta(name, content, property = false) {
  const attr = property ? 'property' : 'name';
  let el = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

// Google Analytics: ID налаштовується адміном, скрипт вмикається лише тоді
let gaLoaded = false;
export async function initGa() {
  if (gaLoaded) return;
  try {
    const s = await api('/api/settings');
    if (!s.gaId) return;
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${s.gaId}`;
    script.async = true;
    document.head.appendChild(script);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', s.gaId);
    gaLoaded = true;
  } catch { /* без аналітики сайт працює як завжди */ }
}

// .ics для додавання події в Google Calendar / календар телефона
export function downloadIcs({ title, description, startsAt, location }) {
  const dt = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const end = new Date(new Date(startsAt).getTime() + 2 * 3600 * 1000).toISOString();
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Svidomyi Vybir//UA', 'BEGIN:VEVENT',
    `UID:${Date.now()}@sv-vybir`, `DTSTAMP:${dt(new Date().toISOString())}`,
    `DTSTART:${dt(startsAt)}`, `DTEND:${dt(end)}`,
    `SUMMARY:${title}`, `DESCRIPTION:${(description || '').slice(0, 200)}`,
    `LOCATION:${location || ''}`, 'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'event.ics';
  a.click();
  URL.revokeObjectURL(url);
}
