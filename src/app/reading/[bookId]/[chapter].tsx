import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsSheet } from '../../../components/SettingsSheet';
import { useToast } from '../../../components/Toast';
import { Chip, Eyebrow, IconButton, ProgressBar, SkeletonLines } from '../../../components/ui';
import { bookById, chapterCount } from '../../../constants/books';
import { DARK, serif } from '../../../constants/theme';
import {
  BibleApiError,
  effectiveVersion,
  getChapter,
  VERSIONS,
} from '../../../services/bibleApi';
import { useApp } from '../../../store/AppContext';
import { shareVerse } from '../../../utils/share';

type ChapterState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; verses: string[] };

const SWIPE_DX = 70;
const SWIPE_DY = 60;

export default function ReadingScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{
    bookId: string;
    chapter: string;
    verse?: string;
  }>();
  const {
    settings,
    theme,
    toggleTheme,
    toggleFavorite,
    isFavorite,
    setLastRead,
    logChapterRead,
  } = useApp();
  const { showToast } = useToast();

  const book = bookById(params.bookId ?? '');
  const initialChapter = Math.max(1, parseInt(params.chapter ?? '1', 10) || 1);
  const initialVerse = params.verse ? parseInt(params.verse, 10) || null : null;

  const [chapter, setChapter] = useState(initialChapter);
  const [sel, setSel] = useState<number | null>(initialVerse);
  const [state, setState] = useState<ChapterState>({ status: 'loading' });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [foco, setFoco] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const pendingScrollToVerse = useRef<number | null>(initialVerse);

  // Deuterocanônicos saem sempre da Ave Maria, seja qual for a versão ativa.
  const effVersion = book ? effectiveVersion(settings.version, book.id) : settings.version;
  const versionLabel =
    VERSIONS.find((v) => v.id === effVersion)?.label ?? effVersion.toUpperCase();
  const totalChapters = book ? chapterCount(book, settings.version) : 1;

  const load = useCallback(() => {
    if (!book) return;
    setState({ status: 'loading' });
    let cancelled = false;
    getChapter(settings.version, book.id, chapter)
      .then((verses) => {
        if (cancelled) return;
        setState({ status: 'ok', verses });
        setLastRead({ book: book.id, chapter });
        logChapterRead(book.id, chapter);
      })
      .catch((err) => {
        if (cancelled) return;
        const message =
          err instanceof BibleApiError
            ? err.message
            : 'Não foi possível carregar este capítulo.';
        setState({ status: 'error', message });
      });
    return () => {
      cancelled = true;
    };
  }, [book, chapter, settings.version, setLastRead, logChapterRead]);

  useEffect(() => load(), [load]);

  if (!book) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: theme.sub }}>Livro não encontrado.</Text>
      </View>
    );
  }

  const goToChapter = (n: number) => {
    if (n < 1 || n > totalChapters) return;
    setChapter(n);
    setSel(null);
    pendingScrollToVerse.current = null;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const onTouchStart = (e: GestureResponderEvent) => {
    touchStart.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
  };

  const onTouchEnd = (e: GestureResponderEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const dx = e.nativeEvent.pageX - start.x;
    const dy = e.nativeEvent.pageY - start.y;
    if (Math.abs(dx) > SWIPE_DX && Math.abs(dy) < SWIPE_DY) {
      goToChapter(dx < 0 ? chapter + 1 : chapter - 1);
    }
  };

  const handleToggleFavorite = (verseNumber: number, text: string) => {
    const added = toggleFavorite({
      book: book.id,
      chapter,
      verse: verseNumber,
      text,
      version: settings.version,
    });
    showToast(added ? 'Guardado nos favoritos' : 'Removido dos favoritos');
  };

  const selText = state.status === 'ok' && sel ? state.verses[sel - 1] : null;
  const selRef = `${book.name} ${chapter}:${sel ?? ''}`;
  const chapPct = (chapter / totalChapters) * 100;
  const fontPx = settings.fontSize;
  const lineHeight = fontPx * 1.78;

  // Rolagem aproximada até o versículo alvo (vindo de busca/favoritos/home).
  const onContentSizeChange = (_w: number, h: number) => {
    const target = pendingScrollToVerse.current;
    if (!target) return;
    if (state.status !== 'ok') return; // aguarda o conteúdo real (não o esqueleto)
    pendingScrollToVerse.current = null;
    if (target <= 3) return;
    const y = Math.max(0, ((target - 1) / state.verses.length) * h - 140);
    setTimeout(() => scrollRef.current?.scrollTo({ y, animated: false }), 30);
  };

  const verseStyle = (n: number): object[] => {
    const s: object[] = [];
    if (sel === n) s.push({ backgroundColor: theme.accSoft });
    if (isFavorite(book.id, chapter, n)) {
      s.push({
        textDecorationLine: 'underline' as const,
        textDecorationStyle: 'dotted' as const,
        textDecorationColor: theme.acc,
      });
    }
    return s;
  };

  const renderVerse = (text: string, i: number) => {
    const n = i + 1;
    return (
      <Text
        key={n}
        suppressHighlighting
        onPress={() => setSel(sel === n ? null : n)}
        onLongPress={() => handleToggleFavorite(n, text)}
        style={verseStyle(n)}
      >
        {settings.showVerseNumbers && (
          <Text
            style={{
              fontSize: fontPx * 0.55,
              color: theme.acc,
              fontWeight: '600',
              fontFamily: undefined,
            }}
          >
            {n}{' '}
          </Text>
        )}
        {text}
        {settings.verseLayout === 'corrido' ? ' ' : ''}
      </Text>
    );
  };

  // Modo Foco (variante 1b do design): leitura noturna imersiva — sem números,
  // sem chrome, tipografia maior, controles num pill flutuante.
  if (foco) {
    const focoFont = fontPx + 2;
    return (
      <View style={{ flex: 1, backgroundColor: DARK.bg }}>
        <StatusBar style="light" animated />
        <View
          style={{
            position: 'absolute',
            top: insets.top + 6,
            left: 0,
            height: 2,
            width: `${chapPct}%`,
            backgroundColor: '#B07A50',
            zIndex: 4,
          }}
        />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: insets.top + 48,
            paddingHorizontal: 30,
            paddingBottom: 150,
          }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          showsVerticalScrollIndicator={false}
        >
          <Text style={focoStyles.eyebrow}>
            {`${book.name} · capítulo ${chapter}`.toUpperCase()}
          </Text>

          {state.status === 'loading' &&
            [100, 100, 68, 100, 68, 100].map((w, i) => (
              <View
                key={i}
                style={{
                  height: 15,
                  borderRadius: 8,
                  backgroundColor: DARK.line,
                  opacity: 0.55,
                  marginBottom: 18,
                  width: `${w}%`,
                }}
              />
            ))}

          {state.status === 'error' && (
            <View style={{ gap: 16 }}>
              <Text style={{ fontSize: 13.5, lineHeight: 21.5, color: DARK.sub }}>
                {state.message} Capítulos já visitados ficam disponíveis offline.
              </Text>
              <Pressable onPress={load} style={focoStyles.retry}>
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: DARK.ink }}>
                  Tentar novamente
                </Text>
              </Pressable>
            </View>
          )}

          {state.status === 'ok' &&
            state.verses.map((text, i) => (
              <Text
                key={i + 1}
                suppressHighlighting
                onLongPress={() => handleToggleFavorite(i + 1, text)}
                style={[
                  { color: DARK.ink, marginBottom: 22 },
                  i === 0
                    ? {
                        fontFamily: serif.medium,
                        fontSize: focoFont + 6,
                        lineHeight: (focoFont + 6) * 1.55,
                      }
                    : {
                        fontFamily: serif.regular,
                        fontSize: focoFont,
                        lineHeight: focoFont * 1.85,
                      },
                  isFavorite(book.id, chapter, i + 1) && {
                    textDecorationLine: 'underline' as const,
                    textDecorationStyle: 'dotted' as const,
                    textDecorationColor: DARK.acc,
                  },
                ]}
              >
                {text}
              </Text>
            ))}
        </ScrollView>

        {/* Pill flutuante de controles (design .fpill) */}
        <View style={[focoStyles.pill, { bottom: insets.bottom + 24 }]}>
          <Pressable
            onPress={() => goToChapter(chapter - 1)}
            disabled={chapter <= 1}
            style={chapter <= 1 && { opacity: 0.35 }}
            accessibilityLabel="Capítulo anterior"
          >
            <Feather name="chevron-left" size={16} color={DARK.sub} />
          </Pressable>
          <Text style={focoStyles.pillLabel}>
            CAPÍTULO {chapter} DE {totalChapters}
          </Text>
          <Pressable
            onPress={() => goToChapter(chapter + 1)}
            disabled={chapter >= totalChapters}
            style={chapter >= totalChapters && { opacity: 0.35 }}
            accessibilityLabel="Próximo capítulo"
          >
            <Feather name="chevron-right" size={16} color={DARK.sub} />
          </Pressable>
          <Pressable onPress={() => setSheetOpen(true)} accessibilityLabel="Ajustes de leitura">
            <Text style={{ fontFamily: serif.semibold, fontSize: 15, color: '#C8B999' }}>
              Aa
            </Text>
          </Pressable>
          <Pressable onPress={() => setFoco(false)} accessibilityLabel="Sair do modo foco">
            <Feather name="minimize-2" size={15} color={DARK.sub} />
          </Pressable>
        </View>

        <SettingsSheet
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
          foco={foco}
          onToggleFoco={setFoco}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Cabeçalho */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 10, borderBottomColor: theme.line },
        ]}
      >
        <IconButton
          icon="chevron-left"
          label="Voltar"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace(`/books/${book.id}`);
          }}
        />
        <Pressable
          onPress={() => router.navigate(`/books/${book.id}`)}
          style={({ pressed }) => [styles.titleBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.title, { color: theme.ink }]} numberOfLines={1}>
            {book.name} {chapter}
          </Text>
          <Feather name="chevron-down" size={16} color={theme.ink} />
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <IconButton onPress={() => setSheetOpen(true)} label="Ajustes de leitura">
            <Text style={[styles.aa, { color: theme.ink }]}>Aa</Text>
          </IconButton>
          <IconButton
            icon={theme.name === 'dark' ? 'sun' : 'moon'}
            onPress={toggleTheme}
            label="Alternar modo claro/escuro"
          />
        </View>
      </View>

      {/* Corpo */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onContentSizeChange={onContentSizeChange}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.chnum, { color: theme.acc }]}>{chapter}</Text>

        {state.status === 'loading' && <SkeletonLines count={9} />}

        {state.status === 'error' && (
          <View>
            <View
              style={[
                styles.offcard,
                { backgroundColor: theme.card, borderColor: theme.line },
              ]}
            >
              <View style={[styles.offpill, { backgroundColor: theme.accFaint }]}>
                <Feather name="wifi-off" size={11} color={theme.acc} />
                <Eyebrow color={theme.acc} style={{ fontSize: 10 }}>
                  Sem conexão · não cacheado
                </Eyebrow>
              </View>
              <Text style={[styles.offtxt, { color: theme.sub }]}>
                {state.message} Capítulos já visitados ficam disponíveis offline.
              </Text>
              <View style={{ flexDirection: 'row' }}>
                <Chip label="Tentar novamente" onPress={load} />
              </View>
            </View>
            <SkeletonLines count={5} />
          </View>
        )}

        {state.status === 'ok' &&
          (settings.verseLayout === 'corrido' ? (
            <Text
              style={{
                fontFamily: serif.regular,
                fontSize: fontPx,
                lineHeight,
                color: theme.ink,
              }}
            >
              {state.verses.map(renderVerse)}
            </Text>
          ) : (
            // Disposição "Por versículo" — layout Estudo (variante 1c do design):
            // um versículo por linha com a numeração na margem.
            <View>
              {state.verses.map((text, i) => {
                const n = i + 1;
                const favorited = isFavorite(book.id, chapter, n);
                return (
                  <View
                    key={n}
                    style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}
                  >
                    {settings.showVerseNumbers && (
                      <Text
                        style={{
                          width: 30,
                          textAlign: 'right',
                          fontFamily: serif.semibold,
                          fontSize: fontPx * 0.72,
                          lineHeight: fontPx * 1.7,
                          color: theme.acc,
                        }}
                      >
                        {n}
                      </Text>
                    )}
                    <Text
                      suppressHighlighting
                      onPress={() => setSel(sel === n ? null : n)}
                      onLongPress={() => handleToggleFavorite(n, text)}
                      style={[
                        {
                          flex: 1,
                          fontFamily: serif.regular,
                          fontSize: fontPx,
                          lineHeight: fontPx * 1.7,
                          color: theme.ink,
                          borderRadius: 8,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                        },
                        sel === n && { backgroundColor: theme.accSoft },
                        favorited && {
                          textDecorationLine: 'underline' as const,
                          textDecorationStyle: 'dotted' as const,
                          textDecorationColor: theme.acc,
                        },
                      ]}
                    >
                      {text}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
      </ScrollView>

      {/* Barra de seleção de versículo. Em telas largas segue o design em linha
          única; em telas estreitas empilha (referência + fechar em cima,
          botões simétricos embaixo) para nada ficar espremido. */}
      {sel !== null && selText && (
        <View
          style={[
            styles.selbar,
            {
              // rodapé = 70px + safe area; a barra flutua 8px acima dele
              bottom: Math.max(insets.bottom, 14) + 78,
              backgroundColor: theme.card,
              borderColor: theme.line,
            },
          ]}
        >
          {width < 400 ? (
            <View style={{ gap: 10 }}>
              <View style={styles.selTopRow}>
                {/* espaçador com a largura do X para a referência centralizar de verdade */}
                <View style={{ width: 30 }} />
                <Text
                  style={[styles.selref, { color: theme.ink, textAlign: 'center' }]}
                  numberOfLines={1}
                >
                  {selRef}
                </Text>
                <Pressable
                  onPress={() => setSel(null)}
                  style={styles.selx}
                  accessibilityLabel="Fechar"
                >
                  <Feather name="x" size={16} color={theme.sub} />
                </Pressable>
              </View>
              <View style={styles.selBtnRow}>
                <Pressable
                  onPress={() => handleToggleFavorite(sel, selText)}
                  style={[styles.selbtn, styles.selbtnGrow, { backgroundColor: theme.accFaint }]}
                >
                  <Feather name="bookmark" size={14} color={theme.acc} />
                  <Text style={[styles.selbtnLabel, { color: theme.acc }]}>
                    {isFavorite(book.id, chapter, sel) ? 'Remover' : 'Favoritar'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => shareVerse(selText, selRef, versionLabel)}
                  style={[styles.selbtn, styles.selbtnGrow, { backgroundColor: theme.accFaint }]}
                >
                  <Feather name="share" size={14} color={theme.acc} />
                  <Text style={[styles.selbtnLabel, { color: theme.acc }]}>Compartilhar</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.selWideRow}>
              <Text style={[styles.selref, { color: theme.ink }]} numberOfLines={1}>
                {selRef}
              </Text>
              <Pressable
                onPress={() => handleToggleFavorite(sel, selText)}
                style={[styles.selbtn, { backgroundColor: theme.accFaint }]}
              >
                <Feather name="bookmark" size={14} color={theme.acc} />
                <Text style={[styles.selbtnLabel, { color: theme.acc }]}>
                  {isFavorite(book.id, chapter, sel) ? 'Remover' : 'Favoritar'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => shareVerse(selText, selRef, versionLabel)}
                style={[styles.selbtn, { backgroundColor: theme.accFaint }]}
              >
                <Feather name="share" size={14} color={theme.acc} />
                <Text style={[styles.selbtnLabel, { color: theme.acc }]}>Compartilhar</Text>
              </Pressable>
              <Pressable
                onPress={() => setSel(null)}
                style={styles.selx}
                accessibilityLabel="Fechar"
              >
                <Feather name="x" size={16} color={theme.sub} />
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* Rodapé: navegação de capítulos + progresso */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, 14) + 10,
            backgroundColor: theme.bg,
            borderTopColor: theme.line,
          },
        ]}
      >
        <IconButton
          icon="chevron-left"
          disabled={chapter <= 1}
          onPress={() => goToChapter(chapter - 1)}
          label="Capítulo anterior"
        />
        <View style={styles.pwrap}>
          <Text style={[styles.prog, { color: theme.sub }]}>
            CAPÍTULO {chapter} DE {totalChapters}
          </Text>
          <ProgressBar pct={chapPct} />
        </View>
        <IconButton
          icon="chevron-right"
          disabled={chapter >= totalChapters}
          onPress={() => goToChapter(chapter + 1)}
          label="Próximo capítulo"
        />
      </View>

      <SettingsSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        foco={foco}
        onToggleFoco={setFoco}
      />
    </View>
  );
}

const focoStyles = StyleSheet.create({
  eyebrow: {
    fontSize: 10.5,
    letterSpacing: 1.5,
    fontWeight: '700',
    color: DARK.sub,
    marginBottom: 26,
  },
  retry: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: DARK.line,
    backgroundColor: DARK.card,
  },
  pill: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(35,28,21,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(234,225,205,0.14)',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  pillLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1,
    color: DARK.sub,
  },
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  titleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexShrink: 1,
  },
  title: {
    fontFamily: serif.semibold,
    fontSize: 16,
  },
  aa: {
    fontFamily: serif.semibold,
    fontSize: 15,
  },
  body: {
    paddingHorizontal: 26,
    paddingTop: 26,
    paddingBottom: 40,
  },
  chnum: {
    fontFamily: serif.light,
    fontSize: 62,
    lineHeight: 66,
    opacity: 0.4,
    marginBottom: 12,
  },
  offcard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    marginBottom: 26,
  },
  offpill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
  offtxt: {
    fontSize: 13.5,
    lineHeight: 21.5,
    marginBottom: 14,
  },
  selbar: {
    position: 'absolute',
    left: 14,
    right: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#1e140a',
    shadowOpacity: 0.18,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    zIndex: 8,
  },
  selWideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selbtnGrow: {
    flex: 1,
    justifyContent: 'center',
  },
  selref: {
    fontFamily: serif.semibold,
    fontSize: 13,
    flexGrow: 1,
    flexShrink: 1,
  },
  selbtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  selbtnLabel: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  selx: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  pwrap: {
    flex: 1,
    alignItems: 'center',
  },
  prog: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 7,
  },
});
