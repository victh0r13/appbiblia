import { Book, BOOKS } from '../constants/books';
import { norm } from './normalize';

export interface RefResult {
  book: Book;
  chapter: number;
  verse: number | null;
}

/**
 * Interpreta uma referência direta como "João 3:16", "Salmos 23",
 * "1 Coríntios 13.4" (aceita ":" ou "." entre capítulo e versículo).
 * O nome do livro casa por prefixo, sem acentos e sem caixa.
 */
export function parseReference(q: string): RefResult | null {
  const m = /^([1-3]?\s*[^\d:.]+?)\s*(\d+)(?:\s*[:.]\s*(\d+))?$/.exec(q.trim());
  if (!m) return null;
  const name = norm(m[1].replace(/\s+/g, ' ').trim());
  if (name.length < 2) return null;
  const book = BOOKS.find((b) => norm(b.name).startsWith(name));
  if (!book) return null;
  const chapter = parseInt(m[2], 10);
  // Aceita até a contagem mais ampla entre os cânones (Ester 16, Daniel 14 na
  // católica); a tela de leitura avisa se a versão ativa não tiver o capítulo.
  const max = Math.max(book.chapters, book.chaptersAm ?? 0);
  if (chapter < 1 || chapter > max) return null;
  return { book, chapter, verse: m[3] ? parseInt(m[3], 10) : null };
}
