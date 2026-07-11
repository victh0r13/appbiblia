import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Chip, Eyebrow, H1 } from '../../components/ui';
import { serif } from '../../constants/theme';
import { SearchHit, searchCachedChapters } from '../../services/bibleApi';
import { useApp } from '../../store/AppContext';
import { norm } from '../../utils/normalize';
import { parseReference } from '../../utils/refParse';

const SUGGESTIONS = ['João 3:16', 'Salmos 23', 'Tobias 4', 'pastor', 'luz'];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { theme, settings } = useApp();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  const q = query.trim();
  const refResult = useMemo(() => (q ? parseReference(q) : null), [q]);
  const keywordActive = !refResult && norm(q).length >= 3;

  // Busca por palavra-chave nos capítulos offline (com debounce).
  useEffect(() => {
    if (!keywordActive) {
      setHits([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      searchCachedChapters(settings.version, q).then((results) => {
        if (!cancelled) {
          setHits(results);
          setSearching(false);
        }
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [keywordActive, q, settings.version]);

  const openHit = (hit: SearchHit) =>
    router.push(`/reading/${hit.book.id}/${hit.chapter}?verse=${hit.verse}`);

  const noResults = !!q && !refResult && !searching && keywordActive && hits.length === 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + 22,
        paddingHorizontal: 20,
        paddingBottom: 28,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <H1>Busca</H1>
      <View
        style={[styles.inputWrap, { backgroundColor: theme.card, borderColor: theme.line }]}
      >
        <Feather name="search" size={16} color={theme.sub} />
        <TextInput
          style={[styles.input, { color: theme.ink }]}
          placeholder="Referência ou palavra — ex.: João 3:16"
          placeholderTextColor={theme.sub}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
        {query !== '' && (
          <Pressable onPress={() => setQuery('')} accessibilityLabel="Limpar busca">
            <Feather name="x" size={16} color={theme.sub} />
          </Pressable>
        )}
      </View>

      {/* Referência direta */}
      {refResult && (
        <Card
          style={styles.refres}
          onPress={() =>
            router.push(
              `/reading/${refResult.book.id}/${refResult.chapter}${
                refResult.verse ? `?verse=${refResult.verse}` : ''
              }`
            )
          }
        >
          <View style={{ gap: 8 }}>
            <Eyebrow color={theme.acc}>Ir para referência</Eyebrow>
            <Text style={{ fontFamily: serif.semibold, fontSize: 20, color: theme.ink }}>
              {refResult.book.name} {refResult.chapter}
              {refResult.verse ? `:${refResult.verse}` : ''}
            </Text>
          </View>
          <Text style={{ fontSize: 26, color: theme.sub }}>›</Text>
        </Card>
      )}

      {/* Resultados por palavra-chave (capítulos offline) */}
      {hits.length > 0 && (
        <View>
          <Eyebrow style={{ marginBottom: 8 }}>
            {`${hits.length} ${hits.length === 1 ? 'resultado' : 'resultados'} ${
              settings.version === 'am' ? 'na Bíblia toda (offline)' : 'nos capítulos offline'
            }`}
          </Eyebrow>
          {hits.map((hit) => (
            <Pressable
              key={`${hit.book.id}-${hit.chapter}-${hit.verse}`}
              onPress={() => openHit(hit)}
              style={({ pressed }) => [
                styles.kwrow,
                { borderBottomColor: theme.line },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.kwref, { color: theme.acc }]}>
                {`${hit.book.name} ${hit.chapter}:${hit.verse}`.toUpperCase()}
              </Text>
              <Text
                style={[styles.kwtxt, { color: theme.ink }]}
                numberOfLines={3}
              >
                {hit.text}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {searching && (
        <Text style={[styles.hint, { color: theme.sub }]}>Buscando nos capítulos offline…</Text>
      )}

      {noResults && (
        <Text style={[styles.hint, { color: theme.sub }]}>
          {settings.version === 'am'
            ? 'Nada encontrado. Tente uma referência como “João 3:16” ou outra palavra.'
            : 'Nada encontrado nos capítulos baixados. Tente uma referência como “João 3:16” ou outra palavra.'}
        </Text>
      )}

      {!q && (
        <View>
          <Eyebrow style={{ marginBottom: 8 }}>Sugestões</Eyebrow>
          <View style={styles.chips}>
            {SUGGESTIONS.map((s) => (
              <Chip key={s} label={s} onPress={() => setQuery(s)} />
            ))}
          </View>
          <Text style={[styles.hint, { color: theme.sub }]}>
            {settings.version === 'am'
              ? 'Busque por referência direta (livro, capítulo e versículo) ou por palavra-chave. Na Ave Maria, a busca por palavra percorre a Bíblia inteira, mesmo offline.'
              : 'Busque por referência direta (livro, capítulo e versículo) ou por palavra-chave. Nesta versão, a busca por palavra percorre os capítulos já baixados no aparelho — a API não oferece busca textual completa.'}
          </Text>
        </View>
      )}
    </ScrollView>
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
  refres: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 10,
  },
  kwrow: {
    gap: 4,
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  kwref: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  kwtxt: {
    fontFamily: serif.regular,
    fontSize: 14.5,
    lineHeight: 22.5,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hint: {
    fontSize: 12,
    lineHeight: 19,
    marginTop: 20,
  },
});
