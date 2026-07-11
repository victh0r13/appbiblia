import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountSection } from '../components/AccountSection';
import { Card, Eyebrow, H1, IconButton, Segmented } from '../components/ui';
import { BOOKS } from '../constants/books';
import { serif } from '../constants/theme';
import { VERSIONS } from '../services/bibleApi';
import { useApp } from '../store/AppContext';
import { computeStreak } from '../utils/streak';

const TOTAL_CHAPTERS = BOOKS.reduce((sum, b) => sum + b.chapters, 0); // 1189

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { theme, settings, profile, readingLog, favorites, updateProfile, updateSettings } =
    useApp();

  const streak = useMemo(() => computeStreak(readingLog.days), [readingLog.days]);
  const chaptersRead = readingLog.chapters.length;
  const pct = Math.min(100, (chaptersRead / TOTAL_CHAPTERS) * 100);
  const initial = profile.name.trim().charAt(0).toUpperCase();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + 22,
        paddingHorizontal: 20,
        paddingBottom: 40,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: 'row', marginBottom: 14 }}>
        <IconButton
          icon="chevron-left"
          label="Voltar"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
      </View>
      <H1>Perfil</H1>

      {/* Nome */}
      <Card style={styles.nameCard}>
        <View style={[styles.avatar, { backgroundColor: theme.accFaint }]}>
          {initial ? (
            <Text style={{ fontFamily: serif.semibold, fontSize: 22, color: theme.acc }}>
              {initial}
            </Text>
          ) : (
            <Feather name="user" size={22} color={theme.acc} />
          )}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Eyebrow>Seu nome</Eyebrow>
          <TextInput
            style={[styles.nameInput, { color: theme.ink }]}
            placeholder="Seu nome"
            placeholderTextColor={theme.sub}
            value={profile.name}
            onChangeText={(name) => updateProfile({ name })}
            autoCorrect={false}
            maxLength={40}
          />
        </View>
      </Card>
      <Text style={[styles.note, { color: theme.sub }]}>
        Seus dados ficam apenas neste aparelho — nada é enviado para servidores.
      </Text>

      {/* Estatísticas */}
      <Eyebrow style={{ marginTop: 22, marginBottom: 10 }}>Sua leitura</Eyebrow>
      <View style={styles.statsGrid}>
        <Card style={styles.stat}>
          <Text style={[styles.statNum, { color: theme.acc }]}>{streak}</Text>
          <Text style={[styles.statLabel, { color: theme.sub }]}>
            {streak === 1 ? 'dia seguido' : 'dias seguidos'}
          </Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={[styles.statNum, { color: theme.acc }]}>{chaptersRead}</Text>
          <Text style={[styles.statLabel, { color: theme.sub }]}>
            {chaptersRead === 1 ? 'capítulo lido' : 'capítulos lidos'}
          </Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={[styles.statNum, { color: theme.acc }]}>
            {pct < 1 && pct > 0 ? '<1' : Math.round(pct)}%
          </Text>
          <Text style={[styles.statLabel, { color: theme.sub }]}>da Bíblia</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={[styles.statNum, { color: theme.acc }]}>{favorites.length}</Text>
          <Text style={[styles.statLabel, { color: theme.sub }]}>
            {favorites.length === 1 ? 'favorito' : 'favoritos'}
          </Text>
        </Card>
      </View>

      {/* Preferências */}
      <Eyebrow style={{ marginTop: 22, marginBottom: 10 }}>Preferências</Eyebrow>
      <Card style={{ paddingHorizontal: 18 }}>
        <View style={[styles.prefRow, { borderBottomColor: theme.line }]}>
          <Text style={[styles.prefLabel, { color: theme.ink }]}>Versão</Text>
          <Segmented
            compact
            options={VERSIONS.map((v) => ({ value: v.id, label: v.label }))}
            value={settings.version}
            onChange={(version) => updateSettings({ version })}
          />
        </View>
        <View style={[styles.prefRow, { borderBottomWidth: 0 }]}>
          <Text style={[styles.prefLabel, { color: theme.ink }]}>Tema</Text>
          <Segmented
            compact
            options={[
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Escuro' },
            ]}
            value={settings.theme}
            onChange={(t) => updateSettings({ theme: t })}
          />
        </View>
      </Card>

      <AccountSection />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  nameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameInput: {
    fontFamily: serif.medium,
    fontSize: 17,
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  note: {
    fontSize: 11.5,
    lineHeight: 17,
    marginTop: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stat: {
    flexBasis: '47%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 18,
    paddingHorizontal: 8,
  },
  statNum: {
    fontFamily: serif.semibold,
    fontSize: 30,
    lineHeight: 36,
  },
  statLabel: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Em telas estreitas o controle desce para a linha de baixo.
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  prefLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
