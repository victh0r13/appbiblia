const FALLBACK_MAP: Record<string, string> = {
  á: 'a', à: 'a', â: 'a', ã: 'a', ä: 'a',
  é: 'e', è: 'e', ê: 'e', ë: 'e',
  í: 'i', ì: 'i', î: 'i', ï: 'i',
  ó: 'o', ò: 'o', ô: 'o', õ: 'o', ö: 'o',
  ú: 'u', ù: 'u', û: 'u', ü: 'u',
  ç: 'c', ñ: 'n',
};

/** Normaliza para busca sem acentos e sem caixa ("João" → "joao"). */
export function norm(s: string): string {
  const lower = (s || '').toLowerCase();
  try {
    return lower.normalize('NFD').replace(/[̀-ͯ]/g, '');
  } catch {
    return lower.replace(/[áàâãäéèêëíìîïóòôõöúùûüçñ]/g, (c) => FALLBACK_MAP[c] ?? c);
  }
}
