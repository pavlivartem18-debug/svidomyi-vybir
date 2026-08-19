// У dev: запити на /api та /uploads проксуються Vite на localhost:4000 (див. vite.config.js)
// У продакшні (Vercel): запити йдуть на RENDER_API_URL (налаштовується в Vercel → Settings → Environment Variables)
// Якщо змінної немає — використовуємо той самий origin (корисно, коли Express роздає і фронтенд, і API)
const API = import.meta.env.VITE_API_URL || '';

export const imgUrl = (path) => (path ? (API || window.location.origin) + path : '');

let token = localStorage.getItem('token');
export const setToken = (t) => {
  token = t;
  if (t) localStorage.setItem('token', t);
  else localStorage.removeItem('token');
};

export async function api(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  if (token) headers.Authorization = 'Bearer ' + token;
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  const res = await fetch(API + path, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Помилка запиту');
  return data;
}
