import { dayKey } from '../store/AppContext';

/**
 * Sequência de dias consecutivos com leitura, terminando hoje (ou ontem,
 * para não zerar antes de a pessoa ler no dia corrente).
 */
export function computeStreak(days: string[], now: Date = new Date()): number {
  const set = new Set(days);
  const cursor = new Date(now);
  if (!set.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (set.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
