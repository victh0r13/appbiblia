import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Chip, Eyebrow, GhostButton, H1, IconButton, ProgressBar, SkeletonLines } from '../../components/ui';
import { bookById, chapterCount } from '../../constants/books';
import { verseOfTheDay } from '../../constants/popularVerses';
import { serif } from '../../constants/theme';
import { effectiveVersion, getVerse, VERSIONS } from '../../services/bibleApi';
import { useApp } from '../../store/AppContext';
import { useToast } from '../../components/Toast';
import { formatToday, greeting } from '../../utils/date';
import { amPsalmChapter } from '../../utils/psalms';
import { shareVerse } from '../../utils/share';

type VDayState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ok'; text: string };

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { settings, theme, lastRead, profile, toggleTheme, toggleFavorite, isFavorite } =
    useApp();
  const { showToast } = useToast();

  // "Boa noite" ou "Boa noite, Ana" quando o perfil tem nome.
  const firstName = profile.name.trim().split(/\s+/)[0];
  const greetingLine = firstName ? `${greeting()}, ${firstName}` : greeting();

  const vdayRaw = verseOfTheDay();
  // Na Ave Maria os Salmos seguem a numeração da Vulgata ("Salmo 23 (22)").
  const vday =
    vdayRaw.book === 'ps' && effectiveVersion(settings.version, 'ps') === 'am'
      ? { ...vdayRaw, chapter: amPsalmChapter(vdayRaw.chapter) }
      : vdayRaw;
  const vdayBook = bookById(vday.book);
  const vdayRef = `${vdayBook?.name} ${vday.chapter}:${vday.verse}`;
  const versionLabel =
    VERSIONS.find((v) => v.id === settings.version)?.label ?? settings.version.toUpperCase();

  const [vdayState, setVdayState] = useState<VDayState>({ status: 'loading' });

  const loadVday = useCallback(() => {
    let cancelled = false;
    setVdayState({ status: 'loading' });
    getVerse(settings.version, vday.book, vday.chapter, vday.verse)
      .then((text) => {
        if (!cancelled) setVdayState({ status: 'ok', text });
      })
      .catch(() => {
        if (!cancelled) setVdayState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [settings.version, vday.book, vday.chapter, vday.verse]);

  useEffect(() => loadVday(), [loadVday]);

  const lastBook = bookById(lastRead.book);
  const lastPct = lastBook
    ? (lastRead.chapter / chapterCount(lastBook, settings.version)) * 100
    : 0;

  const vdayFaved = isFavorite(vday.book, vday.chapter, vday.verse);

  const openVday = () =>
    router.push(`/reading/${vday.book}/${vday.chapter}?verse=${vday.verse}`);

  const favVday = () => {
    if (vdayState.status !== 'ok') return;
    const added = toggleFavorite({
      book: vday.book,
      chapter: vday.chapter,
      verse: vday.verse,
      text: vdayState.text,
      version: settings.version,
    });
    showToast(added ? 'Guardado nos favoritos' : 'Removido dos favoritos');
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
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Eyebrow>{formatToday()}</Eyebrow>
          <H1>{greetingLine}</H1>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <IconButton icon="user" onPress={() => router.push('/profile')} label="Perfil" />
          <IconButton
            icon={theme.name === 'dark' ? 'sun' : 'moon'}
            onPress={toggleTheme}
            label="Alternar modo claro/escuro"
          />
        </View>
      </View>

      {/* Versículo do dia */}
      <Card style={styles.vday}>
        <Pressable onPress={openVday} disabled={vdayState.status !== 'ok'}>
          <Eyebrow>Versículo do dia</Eyebrow>
          <View style={[styles.orn, { backgroundColor: theme.acc }]} />
          {vdayState.status === 'loading' && (
            <View style={{ marginTop: 16 }}>
              <SkeletonLines count={3} />
            </View>
          )}
          {vdayState.status === 'error' && (
            <View style={{ marginTop: 14, gap: 12 }}>
              <Text style={{ fontSize: 13.5, lineHeight: 21, color: theme.sub }}>
                Não foi possível carregar o versículo do dia. Verifique sua conexão.
              </Text>
              <View style={{ flexDirection: 'row' }}>
                <Chip label="Tentar novamente" onPress={loadVday} />
              </View>
            </View>
          )}
          {vdayState.status === 'ok' && (
            <>
              <Text style={[styles.quote, { color: theme.ink }]}>
                “{vdayState.text}”
              </Text>
              <Text style={[styles.refv, { color: theme.acc }]}>
                {vdayRef.toUpperCase()} · {versionLabel}
              </Text>
            </>
          )}
        </Pressable>
        {vdayState.status === 'ok' && (
          <View style={styles.acts}>
            <GhostButton
              icon="bookmark"
              label={vdayFaved ? 'Guardado' : 'Guardar'}
              onPress={favVday}
            />
            <GhostButton
              icon="share"
              label="Compartilhar"
              onPress={() => shareVerse(vdayState.text, vdayRef, versionLabel)}
            />
          </View>
        )}
      </Card>

      {/* Continuar leitura */}
      {lastBook && (
        <Card
          style={styles.cont}
          onPress={() => router.push(`/reading/${lastRead.book}/${lastRead.chapter}`)}
        >
          <View style={{ flex: 1 }}>
            <Eyebrow>Continuar leitura</Eyebrow>
            <Text style={[styles.contbk, { color: theme.ink }]}>
              {lastBook.name} {lastRead.chapter}
            </Text>
            <ProgressBar pct={lastPct} style={{ marginTop: 10 }} />
          </View>
          <Text style={[styles.chev, { color: theme.sub }]}>›</Text>
        </Card>
      )}

      {/* Atalhos */}
      <View style={styles.grid3}>
        <Card style={styles.tile} onPress={() => router.push('/books')}>
          <Feather name="book-open" size={20} color={theme.acc} />
          <Text style={[styles.tileLabel, { color: theme.ink }]}>Livros</Text>
        </Card>
        <Card style={styles.tile} onPress={() => router.push('/search')}>
          <Feather name="search" size={20} color={theme.acc} />
          <Text style={[styles.tileLabel, { color: theme.ink }]}>Busca</Text>
        </Card>
        <Card style={styles.tile} onPress={() => router.push('/favorites')}>
          <Feather name="bookmark" size={20} color={theme.acc} />
          <Text style={[styles.tileLabel, { color: theme.ink }]}>Favoritos</Text>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  vday: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    marginBottom: 14,
  },
  orn: {
    width: 34,
    height: 2,
    marginTop: 14,
  },
  quote: {
    fontFamily: serif.medium,
    fontSize: 21,
    lineHeight: 31.5,
    marginTop: 12,
    marginBottom: 14,
  },
  refv: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  acts: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  cont: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 14,
  },
  contbk: {
    fontFamily: serif.semibold,
    fontSize: 19,
    marginTop: 5,
  },
  chev: {
    fontSize: 26,
    lineHeight: 28,
  },
  grid3: {
    flexDirection: 'row',
    gap: 10,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingTop: 16,
    paddingBottom: 13,
    paddingHorizontal: 8,
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
