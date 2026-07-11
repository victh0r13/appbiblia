import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { serif } from '../constants/theme';
import { useTheme } from '../store/AppContext';

/** Rótulo pequeno em caixa alta (.eyebrow do design). */
export function Eyebrow({
  children,
  color,
  style,
}: {
  children: React.ReactNode;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  const theme = useTheme();
  return (
    <Text style={[styles.eyebrow, { color: color ?? theme.sub }, style]}>
      {typeof children === 'string' ? children.toUpperCase() : children}
    </Text>
  );
}

/** Título serifado grande (.h1 do design). */
export function H1({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const theme = useTheme();
  return <Text style={[styles.h1, { color: theme.ink }, style]}>{children}</Text>;
}

/** Cartão com fundo e borda do tema (.card do design). */
export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const base = [
    styles.card,
    { backgroundColor: theme.card, borderColor: theme.line },
    style,
  ];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [...base, pressed && styles.pressed]}>
        {children}
      </Pressable>
    );
  }
  return <View style={base}>{children}</View>;
}

/** Botão quadrado de ícone (.icbtn do design). */
export function IconButton({
  icon,
  onPress,
  disabled,
  label,
  children,
}: {
  icon?: React.ComponentProps<typeof Feather>['name'];
  onPress?: () => void;
  disabled?: boolean;
  label?: string;
  children?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.icbtn,
        { backgroundColor: theme.card, borderColor: theme.line },
        disabled && { opacity: 0.35 },
        pressed && !disabled && styles.pressed,
      ]}
    >
      {children ?? (icon ? <Feather name={icon} size={20} color={theme.ink} /> : null)}
    </Pressable>
  );
}

/** Pílula de sugestão/ação (.chip do design). */
export function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: theme.card, borderColor: theme.line },
        pressed && styles.pressed,
      ]}
    >
      <Text style={{ fontSize: 12.5, fontWeight: '600', color: theme.ink }}>{label}</Text>
    </Pressable>
  );
}

/** Botão fantasma arredondado (.ghost2 do design). */
export function GhostButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.ghost,
        { borderColor: theme.line },
        pressed && styles.pressed,
      ]}
    >
      <Feather name={icon} size={14} color={theme.sub} />
      <Text style={{ fontSize: 11, fontWeight: '700', color: theme.sub }}>{label}</Text>
    </Pressable>
  );
}

/** Barra de progresso fina (.pbar/.pfill do design). */
export function ProgressBar({ pct, style }: { pct: number; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View style={[styles.pbar, { backgroundColor: theme.line }, style]}>
      <View
        style={{
          width: `${Math.max(0, Math.min(100, pct))}%`,
          height: '100%',
          borderRadius: 2,
          backgroundColor: theme.acc,
        }}
      />
    </View>
  );
}

/** Linhas de esqueleto para estados de carregamento (.skl do design). */
export function SkeletonLines({ count = 5 }: { count?: number }) {
  const theme = useTheme();
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.skl,
            { backgroundColor: theme.line, width: i % 2 === 1 ? '68%' : '100%' },
          ]}
        />
      ))}
    </View>
  );
}

/** Controle segmentado (.seg/.segb do design). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  compact,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  compact?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.seg,
        { backgroundColor: compact ? theme.bg : theme.card, borderColor: theme.line },
      ]}
    >
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.segb,
              compact ? styles.segbCompact : { flex: 1 },
              on && { backgroundColor: theme.acc },
            ]}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                textAlign: 'center',
                color: on ? theme.bg : theme.sub,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: 10.5,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  h1: {
    fontFamily: serif.semibold,
    fontSize: 30,
    lineHeight: 35,
    marginTop: 6,
    marginBottom: 18,
    letterSpacing: -0.3,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
  },
  icbtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  ghost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  pbar: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%',
  },
  skl: {
    height: 13,
    borderRadius: 7,
    opacity: 0.55,
    marginBottom: 15,
  },
  seg: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 3,
  },
  segb: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 9,
  },
  segbCompact: {
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  pressed: {
    opacity: 0.7,
  },
});
