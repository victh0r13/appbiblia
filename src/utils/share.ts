import { Share } from 'react-native';

/** Compartilha um versículo como texto: “…” — João 3:16 (NVI). */
export async function shareVerse(
  text: string,
  reference: string,
  versionLabel: string
): Promise<void> {
  try {
    await Share.share({ message: `“${text}” — ${reference} (${versionLabel})` });
  } catch {
    // usuário cancelou ou o compartilhamento não está disponível
  }
}
