import AsyncStorage from '@react-native-async-storage/async-storage';

import { AVE_MARIA_LOADERS } from '../../assets/data/avemaria';
import { Book, bookById, BOOKS } from '../constants/books';
import { norm } from '../utils/normalize';
import { parseReference, RefResult } from '../utils/refParse';

/**
 * Camada centralizada de acesso ao texto bíblico.
 *
 * Duas fontes:
 * - AM (Ave Maria, católica, 73 livros): embarcada no app — 100% offline.
 *   Os deuterocanônicos (Tobias, Judite…) saem sempre daqui, em qualquer versão.
 * - NVI/ACF/ARC (evangélicas, 66 livros): API estática
 *   (github.com/MaatheusGois/bible). O arquivo por livro traz todos os
 *   capítulos de uma vez; cada capítulo é salvo em uma chave própria do
 *   AsyncStorage (@biblia:cache:{versão}:{livro}:{capítulo}) para leitura
 *   offline, com cache em memória e deduplicação de requisições em voo.
 */

export type VersionId = 'am' | 'nvi' | 'acf' | 'arc';

export const VERSIONS: { id: VersionId; label: string; name: string }[] = [
  { id: 'am', label: 'AM', name: 'Ave Maria (Católica)' },
  { id: 'nvi', label: 'NVI', name: 'Nova Versão Internacional' },
  { id: 'acf', label: 'ACF', name: 'Almeida Corrigida Fiel' },
  { id: 'arc', label: 'ARC', name: 'Almeida Revista e Corrigida' },
];

export const DEFAULT_VERSION: VersionId = 'am';

/**
 * Versão que efetivamente serve um livro: deuterocanônicos só existem na
 * Ave Maria, então caem nela mesmo com NVI/ACF/ARC selecionada.
 */
export function effectiveVersion(version: VersionId, bookId: string): VersionId {
  if (version === 'am') return 'am';
  return bookById(bookId)?.deutero ? 'am' : version;
}

export class BibleApiError extends Error {
  offline: boolean;
  constructor(message: string, offline = false) {
    super(message);
    this.name = 'BibleApiError';
    this.offline = offline;
  }
}

interface ApiBook {
  id: string;
  name: string;
  chapters: string[][];
}

const SOURCES = [
  (v: VersionId, b: string) =>
    `https://raw.githubusercontent.com/maatheusgois/bible/main/versions/pt-br/${v}/${b}/${b}.json`,
  (v: VersionId, b: string) =>
    `https://cdn.jsdelivr.net/gh/maatheusgois/bible@main/versions/pt-br/${v}/${b}/${b}.json`,
];

const CACHE_PREFIX = '@biblia:cache';

const chapterKey = (version: VersionId, bookId: string, chapter: number) =>
  `${CACHE_PREFIX}:${version}:${bookId}:${chapter}`;

const memCache = new Map<string, string[]>();
const inflight = new Map<string, Promise<ApiBook>>();

async function fetchWithTimeout(url: string, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchBook(version: VersionId, bookId: string): Promise<ApiBook> {
  const key = `${version}:${bookId}`;
  const pending = inflight.get(key);
  if (pending) return pending;

  const task = (async () => {
    let lastError: unknown = null;
    for (const source of SOURCES) {
      try {
        const res = await fetchWithTimeout(source(version, bookId));
        if (!res.ok) {
          lastError = new BibleApiError(`Falha ao baixar o livro (HTTP ${res.status}).`);
          continue;
        }
        // Os arquivos da API têm BOM UTF-8 — JSON.parse falharia com res.json().
        const text = await res.text();
        const data = JSON.parse(text.replace(/^﻿/, '')) as ApiBook;
        if (!data || !Array.isArray(data.chapters)) {
          lastError = new BibleApiError('Resposta da API em formato inesperado.');
          continue;
        }
        return data;
      } catch (err) {
        lastError = err;
      }
    }
    if (lastError instanceof BibleApiError) throw lastError;
    throw new BibleApiError(
      'Não foi possível conectar à API bíblica. Verifique sua conexão.',
      true
    );
  })();

  inflight.set(key, task);
  try {
    return await task;
  } finally {
    inflight.delete(key);
  }
}

async function cacheBook(version: VersionId, book: ApiBook): Promise<void> {
  const pairs: [string, string][] = book.chapters.map((verses, i) => [
    chapterKey(version, book.id, i + 1),
    JSON.stringify(verses),
  ]);
  try {
    // Em lotes para não estourar limites de transação em livros grandes (Salmos: 150).
    for (let i = 0; i < pairs.length; i += 50) {
      await AsyncStorage.multiSet(pairs.slice(i, i + 50));
    }
  } catch {
    // Cache é otimização — falha ao gravar não deve impedir a leitura.
  }
}

function getLocalChapter(bookId: string, chapter: number): string[] {
  const loader = AVE_MARIA_LOADERS[bookId];
  if (!loader) throw new BibleApiError('Livro não disponível na Ave Maria.');
  const verses = loader().chapters[chapter - 1];
  if (!verses) throw new BibleApiError('Capítulo não encontrado nesta versão.');
  return verses;
}

/** Versículos de um capítulo (local → memória → AsyncStorage → rede). */
export async function getChapter(
  version: VersionId,
  bookId: string,
  chapter: number
): Promise<string[]> {
  if (effectiveVersion(version, bookId) === 'am') {
    return getLocalChapter(bookId, chapter);
  }
  const key = chapterKey(version, bookId, chapter);

  const inMem = memCache.get(key);
  if (inMem) return inMem;

  try {
    const stored = await AsyncStorage.getItem(key);
    if (stored) {
      const verses = JSON.parse(stored) as string[];
      memCache.set(key, verses);
      return verses;
    }
  } catch {
    // cache ilegível — segue para a rede
  }

  const book = await fetchBook(version, bookId);
  const verses = book.chapters[chapter - 1];
  if (!verses) {
    throw new BibleApiError('Capítulo não encontrado nesta versão.');
  }
  book.chapters.forEach((vs, i) => memCache.set(chapterKey(version, bookId, i + 1), vs));
  void cacheBook(version, book);
  return verses;
}

/** Texto de um versículo específico (ex.: para o versículo do dia). */
export async function getVerse(
  version: VersionId,
  bookId: string,
  chapter: number,
  verse: number
): Promise<string> {
  const verses = await getChapter(version, bookId, chapter);
  const text = verses[verse - 1];
  if (!text) throw new BibleApiError('Versículo não encontrado.');
  return text;
}

/** Busca por referência direta ("João 3:16") — resolve e carrega o texto. */
export async function getByReference(
  version: VersionId,
  reference: string
): Promise<{ ref: RefResult; verses: string[] } | null> {
  const ref = parseReference(reference);
  if (!ref) return null;
  const verses = await getChapter(version, ref.book.id, ref.chapter);
  return { ref, verses };
}

/** Capítulos de um livro já disponíveis offline (para os pontos da grade). */
export async function getCachedChapters(
  version: VersionId,
  bookId: string
): Promise<Set<number>> {
  const result = new Set<number>();
  // Ave Maria é embarcada: tudo está offline por definição.
  if (effectiveVersion(version, bookId) === 'am') {
    const book = AVE_MARIA_LOADERS[bookId]?.();
    if (book) book.chapters.forEach((_, i) => result.add(i + 1));
    return result;
  }
  try {
    const prefix = `${CACHE_PREFIX}:${version}:${bookId}:`;
    const keys = await AsyncStorage.getAllKeys();
    for (const k of keys) {
      if (k.startsWith(prefix)) {
        const n = parseInt(k.slice(prefix.length), 10);
        if (!Number.isNaN(n)) result.add(n);
      }
    }
  } catch {
    // sem cache legível — retorna vazio
  }
  return result;
}

export interface SearchHit {
  book: Book;
  chapter: number;
  verse: number;
  text: string;
}

/** Busca por palavra-chave na Bíblia Ave Maria embarcada (73 livros, offline). */
function searchLocal(query: string, limit: number): SearchHit[] {
  const nq = norm(query);
  const hits: SearchHit[] = [];
  for (const book of BOOKS) {
    const data = AVE_MARIA_LOADERS[book.id]?.();
    if (!data) continue;
    for (let c = 0; c < data.chapters.length; c++) {
      const verses = data.chapters[c];
      for (let v = 0; v < verses.length; v++) {
        if (norm(verses[v]).includes(nq)) {
          hits.push({ book, chapter: c + 1, verse: v + 1, text: verses[v] });
          if (hits.length >= limit) return hits;
        }
      }
    }
  }
  return hits;
}

/**
 * Busca por palavra-chave. Na Ave Maria percorre a Bíblia inteira (embarcada);
 * nas demais versões, apenas os capítulos já baixados — a API não tem endpoint
 * de busca textual.
 */
export async function searchCachedChapters(
  version: VersionId,
  query: string,
  limit = 30
): Promise<SearchHit[]> {
  const nq = norm(query);
  if (nq.length < 3) return [];
  if (version === 'am') return searchLocal(query, limit);
  const hits: SearchHit[] = [];
  try {
    const prefix = `${CACHE_PREFIX}:${version}:`;
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(prefix));
    for (let i = 0; i < keys.length && hits.length < limit; i += 40) {
      const batch = await AsyncStorage.multiGet(keys.slice(i, i + 40));
      for (const [key, value] of batch) {
        if (!value) continue;
        const [bookId, chapterStr] = key.slice(prefix.length).split(':');
        const book = bookById(bookId);
        if (!book) continue;
        const chapter = parseInt(chapterStr, 10);
        let verses: string[];
        try {
          verses = JSON.parse(value) as string[];
        } catch {
          continue;
        }
        for (let v = 0; v < verses.length; v++) {
          if (norm(verses[v]).includes(nq)) {
            hits.push({ book, chapter, verse: v + 1, text: verses[v] });
            if (hits.length >= limit) break;
          }
        }
        if (hits.length >= limit) break;
      }
    }
  } catch {
    // busca offline é melhor esforço
  }
  // Ordena na ordem canônica dos livros.
  hits.sort(
    (a, b) =>
      a.book.order - b.book.order || a.chapter - b.chapter || a.verse - b.verse
  );
  return hits;
}
