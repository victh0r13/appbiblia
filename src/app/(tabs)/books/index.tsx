import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { H1, Segmented } from '../../../components/ui';
import { Book, BOOKS, chapterCount, Testament } from '../../../constants/books';
import { serif } from '../../../constants/theme';
import { useApp } from '../../../store/AppContext';
import { norm } from '../../../utils/normalize';

export default function BooksScreen() {
  const insets = useSafeAreaInsets();
  const { theme, settings } = useApp();
  const [query, setQuery] = useState('');
  const [testament, setTestament] = useState<Testament>('AT');

  const nq = norm(query.trim());
  const books = useMemo(
    () =>
      nq
        ? BOOKS.filter((b) => norm(b.name).includes(nq))
        : BOOKS.filter((b) => b.testament === testament),
    [nq, testament]
  );

  const renderItem = ({ item }: { item: Book }) => (
    <Pressable
      onPress={() => router.push(`/books/${item.id}`)}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.line },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[styles.name, { color: theme.ink }]}>{item.name}</Text>
      <Text style={[styles.count, { color: theme.sub }]}>
        {chapterCount(item, settings.version)} cap.
        {item.deutero && settings.version !== 'am' ? ' · AM' : ''}
      </Text>
    </Pressable>
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + 22,
        paddingHorizontal: 20,
        paddingBottom: 28,
      }}
      data={books}
      keyExtractor={(b) => b.id}
      renderItem={renderItem}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View>
          <H1>Bíblia</H1>
          <View
            style={[
              styles.inputWrap,
              { backgroundColor: theme.card, borderColor: theme.line },
            ]}
          >
            <Feather name="search" size={16} color={theme.sub} />
            <TextInput
              style={[styles.input, { color: theme.ink }]}
              placeholder="Buscar livro…"
              placeholderTextColor={theme.sub}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
          </View>
          {!nq && (
            <View style={{ marginBottom: 6 }}>
              <Segmented
                options={[
                  { value: 'AT', label: 'Antigo Testamento' },
                  { value: 'NT', label: 'Novo Testamento' },
                ]}
                value={testament}
                onChange={setTestament}
              />
            </View>
          )}
        </View>
      }
      ListEmptyComponent={
        <Text style={{ fontSize: 12, lineHeight: 19, color: theme.sub, marginTop: 20 }}>
          Nenhum livro encontrado para “{query.trim()}”.
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
    paddingVertical: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  name: {
    fontFamily: serif.medium,
    fontSize: 16,
  },
  count: {
    fontSize: 11.5,
    fontWeight: '600',
  },
});
