/**
 * A Ave Maria numera os Salmos pela Vulgata (numeração grega), deslocada em
 * relação à numeração hebraica usada por NVI/ACF/ARC — o clássico
 * "Salmo 23 (22)". Este mapeamento converte capítulo hebraico → Vulgata,
 * usado onde o app aponta referências fixas (versículo do dia, atalhos).
 */
export function amPsalmChapter(hebrew: number): number {
  if (hebrew <= 8) return hebrew;
  if (hebrew === 9 || hebrew === 10) return 9;
  if (hebrew <= 113) return hebrew - 1;
  if (hebrew === 114 || hebrew === 115) return 113;
  if (hebrew === 116) return 114;
  if (hebrew <= 146) return hebrew - 1;
  if (hebrew === 147) return 146;
  return hebrew;
}
