import Slider from '@react-native-community/slider';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { serif } from '../constants/theme';
import { VERSIONS } from '../services/bibleApi';
import { useApp } from '../store/AppContext';
import { Segmented } from './ui';

/** Painel "Aa" de ajustes de leitura (sheet inferior do design). */
export function SettingsSheet({
  visible,
  onClose,
  foco,
  onToggleFoco,
}: {
  visible: boolean;
  onClose: () => void;
  /** Estado do modo foco (leitura imersiva) — só exibido na tela de leitura. */
  foco?: boolean;
  onToggleFoco?: (on: boolean) => void;
}) {
  const insets = useSafeAreaInsets();
  const { settings, theme, updateSettings } = useApp();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Fechar ajustes" />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.card,
            paddingBottom: Math.max(insets.bottom, 20) + 24,
          },
        ]}
      >
        <View style={[styles.grab, { backgroundColor: theme.line }]} />

        <View style={[styles.row, { borderBottomColor: theme.line }]}>
          <Text style={[styles.label, { color: theme.ink }]}>Tamanho do texto</Text>
          <View style={styles.fontRow}>
            <Text style={{ fontFamily: serif.regular, fontSize: 13, color: theme.ink }}>A</Text>
            <Slider
              style={{ width: 130, height: 32 }}
              minimumValue={16}
              maximumValue={26}
              step={1}
              value={settings.fontSize}
              onValueChange={(v) => updateSettings({ fontSize: v })}
              minimumTrackTintColor={theme.acc}
              maximumTrackTintColor={theme.line}
              thumbTintColor={theme.acc}
            />
            <Text style={{ fontFamily: serif.regular, fontSize: 22, color: theme.ink }}>A</Text>
          </View>
        </View>

        <View style={[styles.row, { borderBottomColor: theme.line }]}>
          <Text style={[styles.label, { color: theme.ink }]}>Tema</Text>
          <Segmented
            compact
            options={[
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Escuro' },
            ]}
            value={settings.theme}
            onChange={(theme) => updateSettings({ theme })}
          />
        </View>

        <View style={[styles.row, { borderBottomColor: theme.line }]}>
          <Text style={[styles.label, { color: theme.ink }]}>Números de versículo</Text>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: settings.showVerseNumbers }}
            onPress={() =>
              updateSettings({ showVerseNumbers: !settings.showVerseNumbers })
            }
            style={[
              styles.sw,
              { backgroundColor: settings.showVerseNumbers ? theme.acc : theme.line },
            ]}
          >
            <View
              style={[
                styles.knob,
                {
                  backgroundColor: theme.knob,
                  transform: [{ translateX: settings.showVerseNumbers ? 18 : 0 }],
                },
              ]}
            />
          </Pressable>
        </View>

        <View style={[styles.row, { borderBottomColor: theme.line }]}>
          <Text style={[styles.label, { color: theme.ink }]}>Disposição</Text>
          <Segmented
            compact
            options={[
              { value: 'corrido', label: 'Corrido' },
              { value: 'bloco', label: 'Por versículo' },
            ]}
            value={settings.verseLayout}
            onChange={(verseLayout) => updateSettings({ verseLayout })}
          />
        </View>

        <View
          style={[
            styles.row,
            { borderBottomColor: theme.line },
            !onToggleFoco && { borderBottomWidth: 0 },
          ]}
        >
          <Text style={[styles.label, { color: theme.ink }]}>Versão</Text>
          <Segmented
            compact
            options={VERSIONS.map((v) => ({ value: v.id, label: v.label }))}
            value={settings.version}
            onChange={(version) => updateSettings({ version })}
          />
        </View>

        {onToggleFoco && (
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.label, { color: theme.ink }]}>Modo foco</Text>
              <Text style={{ fontSize: 11.5, lineHeight: 16, color: theme.sub }}>
                Leitura noturna imersiva, sem distrações
              </Text>
            </View>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: !!foco }}
              onPress={() => {
                onToggleFoco(!foco);
                onClose();
              }}
              style={[
                styles.sw,
                { backgroundColor: foco ? theme.acc : theme.line },
              ]}
            >
              <View
                style={[
                  styles.knob,
                  {
                    backgroundColor: theme.knob,
                    transform: [{ translateX: foco ? 18 : 0 }],
                  },
                ]}
              />
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(20,14,8,0.35)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  grab: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Com 4 versões no seletor, o controle pode descer para a linha de baixo.
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  fontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sw: {
    width: 46,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
