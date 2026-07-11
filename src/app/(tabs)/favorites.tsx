import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '../../components/Toast';
import { Card, Chip, Eyebrow, H1 } from '../../components/ui';
import { Book, BOOKS } from '../../constants/books';
import { serif } from '../../constants/theme';
import { VERSIONS } from '../../services/bibleApi';
import { Favorite, useApp } from '../../store/AppContext';
import { shareVerse } from '../../utils/share';

interface FavGroup {
  book: Book;
  items: Favorite[];
}

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { theme, favorites, toggleFavorite, settings } = useApp();
  const { showToast } = useToast();

  // Na Ave Maria, "O Senhor é o meu pastor" é o Salmo 22 (numeração da Vulgata).
  const samplePsalm = settings.version === 'am' ? 22 : 23;

  // Agrupa por livro, na ordem canônica; dentro do livro, por capítulo/versículo.
  const groups = useMemo<FavGroup[]>(() => {
    const result: FavGroup[] = [];
    for (const book of BOOKS) {
      const items = favorites
        .filter((f) => f.book === book.id)
        .sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);
      if (items.length) result.push({ book, items });
    }
    return result;
  }, [favorites]);

  const refOf = (book: Book, f: Favorite) => `${book.name} ${f.chapter}:${f.verse}`;

  const versionLabelOf = (f: Favorite) =>
    VERSIONS.find((v) => v.id === f.version)?.label ?? f.version.toUpperCase();

  const remove = (f: Favorite) => {
    toggleFavorite(f);
    showToast('Removido dos favoritos');
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + 22,
        paddingHorizontal: 20,
        paddingBottom: 28,
      }}
      showsVerticalScrollIndicator={false}
    >
      <H1>Favoritos</H1>

      {groups.length === 0 && (
        <View style={styles.empty}>
          <Feather name="bookmark" size={34} color={theme.sub} style={{ opacity: 0.5 }} />
          <Text style={[styles.emptyText, { color: theme.sub }]}>
            Nenhum versículo guardado ainda. Na leitura, toque longo em um versículo — ou
            toque e escolha “Favoritar”.
          </Text>
          <Chip
            label={`Ler Salmos ${samplePsalm}`}
            onPress={() => router.push(`/reading/ps/${samplePsalm}`)}
          />
        </View>
      )}

      {groups.map(({ book, items }) => (
        <View key={book.id}>
          <Eyebrow style={{ marginTop: 8, marginBottom: 8 }}>{book.name}</Eyebrow>
          {items.map((f) => (
            <Card key={`${f.chapter}-${f.verse}`} style={styles.favrow}>
              <Pressable
                style={{ flex: 1, gap: 5 }}
                onPress={() =>
                  router.push(`/reading/${f.book}/${f.chapter}?verse=${f.verse}`)
                }
              >
                <Text style={[styles.favref, { color: theme.acc }]}>
                  {refOf(book, f).toUpperCase()}
                </Text>
                <Text style={[styles.favtxt, { color: theme.ink }]} numberOfLines={4}>
                  {f.text}
                </Text>
              </Pressable>
              <View style={styles.favacts}>
                <Pressable
                  onPress={() => shareVerse(f.text, refOf(book, f), versionLabelOf(f))}
                  style={styles.fabt}
                  accessibilityLabel="Compartilhar versículo"
                >
                  <Feather name="share" size={16} color={theme.sub} />
                </Pressable>
                <Pressable
                  onPress={() => remove(f)}
                  style={styles.fabt}
                  accessibilityLabel="Remover dos favoritos"
                >
                  <Feather name="trash-2" size={16} color={theme.sub} />
                </Pressable>
              </View>
            </Card>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    gap: 14,
    paddingTop: 56,
    paddingHorizontal: 30,
  },
  emptyText: {
    fontSize: 13.5,
    lineHeight: 21.5,
    textAlign: 'center',
  },
  favrow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingLeft: 16,
    paddingRight: 12,
    paddingVertical: 14,
    marginBottom: 10,
  },
  favref: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  favtxt: {
    fontFamily: serif.regular,
    fontSize: 14.5,
    lineHeight: 22.5,
  },
  favacts: {
    flexDirection: 'row',
    gap: 4,
  },
  fabt: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
