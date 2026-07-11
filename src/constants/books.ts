/**
 * Catálogo dos 73 livros em ordem católica. Os 66 do cânon protestante mantêm os
 * ids e contagens da API (github.com/MaatheusGois/bible — NVI/ACF/ARC); os 7
 * deuterocanônicos (deutero: true) vêm da Bíblia Ave Maria embarcada no app.
 * chaptersAm marca livros cuja contagem difere na Ave Maria (Ester e Daniel,
 * pelos acréscimos gregos do cânon católico).
 */
export type Testament = 'AT' | 'NT';

export interface Book {
  id: string;
  name: string;
  chapters: number;
  /** Contagem na Ave Maria, quando difere (Ester 16, Daniel 14). */
  chaptersAm?: number;
  testament: Testament;
  order: number;
  /** Deuterocanônico — presente apenas no cânon católico (texto: Ave Maria). */
  deutero?: boolean;
}

export const BOOKS: Book[] = [
  { id: "gn", name: "Gênesis", chapters: 50, testament: "AT", order: 0 },
  { id: "ex", name: "Êxodo", chapters: 40, testament: "AT", order: 1 },
  { id: "lv", name: "Levítico", chapters: 27, testament: "AT", order: 2 },
  { id: "nm", name: "Números", chapters: 36, testament: "AT", order: 3 },
  { id: "dt", name: "Deuteronômio", chapters: 34, testament: "AT", order: 4 },
  { id: "js", name: "Josué", chapters: 24, testament: "AT", order: 5 },
  { id: "jud", name: "Juízes", chapters: 21, testament: "AT", order: 6 },
  { id: "rt", name: "Rute", chapters: 4, testament: "AT", order: 7 },
  { id: "1sm", name: "1 Samuel", chapters: 31, testament: "AT", order: 8 },
  { id: "2sm", name: "2 Samuel", chapters: 24, testament: "AT", order: 9 },
  { id: "1kgs", name: "1 Reis", chapters: 22, testament: "AT", order: 10 },
  { id: "2kgs", name: "2 Reis", chapters: 25, testament: "AT", order: 11 },
  { id: "1ch", name: "1 Crônicas", chapters: 29, testament: "AT", order: 12 },
  { id: "2ch", name: "2 Crônicas", chapters: 36, testament: "AT", order: 13 },
  { id: "ezr", name: "Esdras", chapters: 10, testament: "AT", order: 14 },
  { id: "ne", name: "Neemias", chapters: 13, testament: "AT", order: 15 },
  { id: "tb", name: "Tobias", chapters: 14, testament: "AT", order: 16, deutero: true },
  { id: "jt", name: "Judite", chapters: 16, testament: "AT", order: 17, deutero: true },
  { id: "et", name: "Ester", chapters: 10, chaptersAm: 16, testament: "AT", order: 18 },
  { id: "job", name: "Jó", chapters: 42, testament: "AT", order: 19 },
  { id: "ps", name: "Salmos", chapters: 150, testament: "AT", order: 20 },
  { id: "1mc", name: "1 Macabeus", chapters: 16, testament: "AT", order: 21, deutero: true },
  { id: "2mc", name: "2 Macabeus", chapters: 15, testament: "AT", order: 22, deutero: true },
  { id: "prv", name: "Provérbios", chapters: 31, testament: "AT", order: 23 },
  { id: "ec", name: "Eclesiastes", chapters: 12, testament: "AT", order: 24 },
  { id: "so", name: "Cânticos", chapters: 8, testament: "AT", order: 25 },
  { id: "sb", name: "Sabedoria", chapters: 19, testament: "AT", order: 26, deutero: true },
  { id: "eclo", name: "Eclesiástico", chapters: 51, testament: "AT", order: 27, deutero: true },
  { id: "is", name: "Isaías", chapters: 66, testament: "AT", order: 28 },
  { id: "jr", name: "Jeremias", chapters: 52, testament: "AT", order: 29 },
  { id: "lm", name: "Lamentações de Jeremias", chapters: 5, testament: "AT", order: 30 },
  { id: "br", name: "Baruc", chapters: 6, testament: "AT", order: 31, deutero: true },
  { id: "ez", name: "Ezequiel", chapters: 48, testament: "AT", order: 32 },
  { id: "dn", name: "Daniel", chapters: 12, chaptersAm: 14, testament: "AT", order: 33 },
  { id: "ho", name: "Oséias", chapters: 14, testament: "AT", order: 34 },
  { id: "jl", name: "Joel", chapters: 3, chaptersAm: 4, testament: "AT", order: 35 },
  { id: "am", name: "Amós", chapters: 9, testament: "AT", order: 36 },
  { id: "ob", name: "Obadias", chapters: 1, testament: "AT", order: 37 },
  { id: "jn", name: "Jonas", chapters: 4, testament: "AT", order: 38 },
  { id: "mi", name: "Miquéias", chapters: 7, testament: "AT", order: 39 },
  { id: "na", name: "Naum", chapters: 3, testament: "AT", order: 40 },
  { id: "hk", name: "Habacuque", chapters: 3, testament: "AT", order: 41 },
  { id: "zp", name: "Sofonias", chapters: 3, testament: "AT", order: 42 },
  { id: "hg", name: "Ageu", chapters: 2, testament: "AT", order: 43 },
  { id: "zc", name: "Zacarias", chapters: 14, testament: "AT", order: 44 },
  { id: "ml", name: "Malaquias", chapters: 4, chaptersAm: 3, testament: "AT", order: 45 },
  { id: "mt", name: "Mateus", chapters: 28, testament: "NT", order: 46 },
  { id: "mk", name: "Marcos", chapters: 16, testament: "NT", order: 47 },
  { id: "lk", name: "Lucas", chapters: 24, testament: "NT", order: 48 },
  { id: "jo", name: "João", chapters: 21, testament: "NT", order: 49 },
  { id: "act", name: "Atos", chapters: 28, testament: "NT", order: 50 },
  { id: "rm", name: "Romanos", chapters: 16, testament: "NT", order: 51 },
  { id: "1co", name: "1 Coríntios", chapters: 16, testament: "NT", order: 52 },
  { id: "2co", name: "2 Coríntios", chapters: 13, testament: "NT", order: 53 },
  { id: "gl", name: "Gálatas", chapters: 6, testament: "NT", order: 54 },
  { id: "eph", name: "Efésios", chapters: 6, testament: "NT", order: 55 },
  { id: "ph", name: "Filipenses", chapters: 4, testament: "NT", order: 56 },
  { id: "cl", name: "Colossenses", chapters: 4, testament: "NT", order: 57 },
  { id: "1ts", name: "1 Tessalonicenses", chapters: 5, testament: "NT", order: 58 },
  { id: "2ts", name: "2 Tessalonicenses", chapters: 3, testament: "NT", order: 59 },
  { id: "1tm", name: "1 Timóteo", chapters: 6, testament: "NT", order: 60 },
  { id: "2tm", name: "2 Timóteo", chapters: 4, testament: "NT", order: 61 },
  { id: "tt", name: "Tito", chapters: 3, testament: "NT", order: 62 },
  { id: "phm", name: "Filemom", chapters: 1, testament: "NT", order: 63 },
  { id: "hb", name: "Hebreus", chapters: 13, testament: "NT", order: 64 },
  { id: "jm", name: "Tiago", chapters: 5, testament: "NT", order: 65 },
  { id: "1pe", name: "1 Pedro", chapters: 5, testament: "NT", order: 66 },
  { id: "2pe", name: "2 Pedro", chapters: 3, testament: "NT", order: 67 },
  { id: "1jo", name: "1 João", chapters: 5, testament: "NT", order: 68 },
  { id: "2jo", name: "2 João", chapters: 1, testament: "NT", order: 69 },
  { id: "3jo", name: "3 João", chapters: 1, testament: "NT", order: 70 },
  { id: "jd", name: "Judas", chapters: 1, testament: "NT", order: 71 },
  { id: "re", name: "Apocalipse", chapters: 22, testament: "NT", order: 72 },
];

export const bookById = (id: string): Book | undefined => BOOKS.find((b) => b.id === id);

/** Contagem de capítulos do livro na versão ativa. */
export const chapterCount = (book: Book, version: string): number =>
  version === 'am' && book.chaptersAm ? book.chaptersAm : book.chapters;
