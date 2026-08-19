import jwt from 'jsonwebtoken';
import { getDb } from './db.js';

const SECRET = process.env.JWT_SECRET || 'org-site-dev-secret';
export const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '7d' });

export function auth(required = true) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return required ? res.status(401).json({ error: 'Не авторизовано' }) : next();
    try {
      const payload = jwt.verify(token, SECRET);
      const user = getDb().users.find((u) => u.id === payload.id);
      if (!user) return res.status(401).json({ error: 'Користувача не знайдено' });
      req.user = user;
      next();
    } catch {
      return res.status(401).json({ error: 'Токен недійсний або прострочений' });
    }
  };
}

export const adminOnly = (req, res, next) =>
  req.user?.role === 'admin'
    ? next()
    : res.status(403).json({ error: 'Потрібні права адміністратора' });

export const publicUser = ({ password, verifyToken, ...rest }) => rest;
