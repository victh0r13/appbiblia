import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Eyebrow, H1, IconButton } from '../../../components/ui';
import { bookById, chapterCount } from '../../../constants/books';
import { serif } from '../../../constants/theme';
import { effectiveVersion, getCachedChapters } from '../../../services/bibleApi';
import { useApp } from '../../../store/AppContext';

const COLUMNS = 5;

export default function ChaptersScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const { theme, settings, lastRead } = useApp();
  const book = bookById(bookId ?? '');
  const [cached, setCached] = useState<Set<number>>(new Set());

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (book) {
        getCachedChapters(settings.version, book.id).then((set) => {
          if (active) setCached(set);
        });
      }
      return () => {
        active = false;
      };
    }, [book, settings.version])
  );

  if (!book) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, padding: 20, paddingTop: insets.top + 22 }}>
        <H1>Livro não encontrado</H1>
      </View>
    );
  }

  const current = lastRead.book === book.id ? lastRead.chapter : null;
  const embedded = effectiveVersion(settings.version, book.id) === 'am';
  const total = chapterCount(book, settings.version);
  const cells = Array.from({ length: total }, (_, i) => i + 1);
  // 20px de padding em cada lado + 4 espaços de 9px entre as 5 colunas
  const cellSize = (width - 40 - (COLUMNS - 1) * GAP) / COLUMNS;

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
      <View style={{ flexDirection: 'row', marginBottom: 14 }}>
        <IconButton icon="chevron-left" onPress={() => router.back()} label="Voltar" />
      </View>
      <H1 style={{ marginBottom: 0 }}>{book.name}</H1>
      <Eyebrow style={{ marginTop: 8 }}>
        {`${book.testament === 'AT' ? 'Antigo Testamento' : 'Novo Testamento'} · ${total} capítulos${book.deutero ? ' · deuterocanônico' : ''}`}
      </Eyebrow>

      <View style={styles.grid}>
        {cells.map((n) => {
          const isCurrent = n === current;
          return (
            <Pressable
              key={n}
              onPress={() => router.push(`/reading/${book.id}/${n}`)}
              style={({ pressed }) => [
                styles.cell,
                {
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: isCurrent ? theme.acc : theme.card,
                  borderColor: isCurrent ? theme.acc : theme.line,
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text
                style={{
                  fontFamily: serif.regular,
                  fontSize: 16.5,
                  color: isCurrent ? theme.bg : theme.ink,
                }}
              >
                {n}
              </Text>
              {!embedded && cached.has(n) && (
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: isCurrent ? theme.bg : theme.acc },
                  ]}
                />
              )}
            </Pressable>
          );
        })}
      </View>

      <Text style={{ fontSize: 11.5, lineHeight: 17, color: theme.sub }}>
        {embedded
          ? 'A Bíblia Ave Maria é embarcada no app — este livro inteiro funciona offline.'
          : '● disponível offline — capítulos visitados ficam salvos no aparelho e podem ser lidos sem conexão.'}
      </Text>
    </ScrollView>
  );
}

const GAP = 9;

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    marginTop: 16,
    marginBottom: 14,
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderWidth: 1,
  },
  dot: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
