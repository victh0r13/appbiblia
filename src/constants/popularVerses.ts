import { dayOfYear } from '../utils/date';

export interface VerseRef {
  book: string;
  chapter: number;
  verse: number;
}

/**
 * Conjunto de versículos populares usado para sortear o versículo do dia
 * (determinístico por data — o mesmo versículo o dia inteiro).
 * Os ids seguem o catálogo da API (ps = Salmos, jo = João, eph = Efésios…).
 */
export const POPULAR_VERSES: VerseRef[] = [
  { book: 'jo', chapter: 3, verse: 16 },
  { book: 'ps', chapter: 23, verse: 1 },
  { book: 'ph', chapter: 4, verse: 13 },
  { book: 'jr', chapter: 29, verse: 11 },
  { book: 'rm', chapter: 8, verse: 28 },
  { book: 'prv', chapter: 3, verse: 5 },
  { book: 'is', chapter: 41, verse: 10 },
  { book: 'ps', chapter: 46, verse: 1 },
  { book: 'mt', chapter: 11, verse: 28 },
  { book: 'js', chapter: 1, verse: 9 },
  { book: 'ps', chapter: 121, verse: 1 },
  { book: '1co', chapter: 13, verse: 4 },
  { book: 'gl', chapter: 5, verse: 22 },
  { book: 'hb', chapter: 11, verse: 1 },
  { book: 'ps', chapter: 37, verse: 5 },
  { book: 'mt', chapter: 6, verse: 33 },
  { book: 'rm', chapter: 12, verse: 2 },
  { book: 'eph', chapter: 2, verse: 8 },
  { book: '2tm', chapter: 1, verse: 7 },
  { book: '1pe', chapter: 5, verse: 7 },
  { book: 'ps', chapter: 91, verse: 1 },
  { book: 'is', chapter: 40, verse: 31 },
  { book: 'jo', chapter: 14, verse: 6 },
  { book: 'ps', chapter: 119, verse: 105 },
  { book: 'lm', chapter: 3, verse: 22 },
];

export function verseOfTheDay(d: Date = new Date()): VerseRef {
  return POPULAR_VERSES[dayOfYear(d) % POPULAR_VERSES.length];
}
