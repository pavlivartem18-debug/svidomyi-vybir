import bcrypt from 'bcryptjs';
import { getDb, save, uid } from './db.js';

// Прототип: "листи" (верифікація, скидання пароля, сповіщення) не надсилаються,
// а логуються в консоль, а посилання повертаються в відповіді API.
export function sendEmail(to, subject, body) {
  console.log(`\n===== EMAIL → ${to} =====\n${subject}\n${body}\n========================\n`);
}

export function makeVerifyToken(userId) {
  const token = uid('v-');
  getDb().verifyTokens[token] = userId;
  save();
  return token;
}

export function makeResetToken(userId) {
  const token = uid('r-');
  getDb().resetTokens[token] = userId;
  save();
  return token;
}

export const hash = (password) => bcrypt.hashSync(password, 10);
export const compare = (password, hashValue) => bcrypt.compareSync(password, hashValue);
