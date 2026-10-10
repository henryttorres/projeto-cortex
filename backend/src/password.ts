import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export async function hashPassword(value: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(value, salt, 64) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}
export async function checkPassword(value: string, hash: string) {
  const [salt, encoded] = hash.split(':');
  const key = await scrypt(value, salt, 64) as Buffer;
  const expected = Buffer.from(encoded, 'hex');
  return key.length === expected.length && timingSafeEqual(key, expected);
}
