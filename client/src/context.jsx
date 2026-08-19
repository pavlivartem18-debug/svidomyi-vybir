import { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken } from './api.js';
import { dict } from './i18n.js';

/* ---------- Тема (темний режим) ---------- */
const ThemeCtx = createContext();
export const useTheme = () => useContext(ThemeCtx);

function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);
  return <ThemeCtx.Provider value={{ dark, toggle: () => setDark((d) => !d) }}>{children}</ThemeCtx.Provider>;
}

/* ---------- Мова (укр / англ) ---------- */
const LangCtx = createContext();
export const useLang = () => useContext(LangCtx);

function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'uk');
  useEffect(() => localStorage.setItem('lang', lang), [lang]);
  const t = (key) => dict[lang][key] ?? key;
  return (
    <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>
  );
}

/* ---------- Авторизація ---------- */
const AuthCtx = createContext();
export const useAuth = () => useContext(AuthCtx);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('token')) return setReady(true);
    api('/api/auth/me')
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  const login = async (email, password) => {
    const data = await api('/api/auth/login', { method: 'POST', body: { email, password } });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = (payload) => api('/api/auth/register', { method: 'POST', body: payload });

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (payload) => {
    const updated = await api('/api/auth/me', { method: 'PUT', body: payload });
    setUser(updated);
    return updated;
  };

  return (
    <AuthCtx.Provider value={{ user, ready, login, register, logout, updateProfile }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function Providers({ children }) {
  return (
    <ThemeProvider>
      <LangProvider>
        <AuthProvider>{children}</AuthProvider>
      </LangProvider>
    </ThemeProvider>
  );
}
