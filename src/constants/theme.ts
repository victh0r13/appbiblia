/**
 * Tokens de design importados do projeto Claude Design "Bíblia App".
 * Paleta bege/terrosa, acento sépia (#A9553A no claro, #D29B72 no escuro).
 */
export type ThemeName = 'light' | 'dark';

export interface Theme {
  name: ThemeName;
  bg: string;
  card: string;
  ink: string;
  sub: string;
  line: string;
  acc: string;
  accSoft: string;
  accFaint: string;
  knob: string;
}

export const LIGHT: Theme = {
  name: 'light',
  bg: '#F2EBDC',
  card: '#FBF6EA',
  ink: '#3A3125',
  sub: '#8D8069',
  line: 'rgba(59,50,38,0.14)',
  acc: '#A9553A',
  accSoft: '#A9553A26',
  accFaint: '#A9553A14',
  knob: '#FBF6EA',
};

export const DARK: Theme = {
  name: 'dark',
  bg: '#181410',
  card: '#231C15',
  ink: '#EAE1CD',
  sub: '#93876F',
  line: 'rgba(234,225,205,0.13)',
  acc: '#D29B72',
  accSoft: '#D29B7226',
  accFaint: '#D29B7214',
  knob: '#FBF6EA',
};

export const themes: Record<ThemeName, Theme> = { light: LIGHT, dark: DARK };

/** Família serifada do design (Literata). */
export const serif = {
  light: 'Literata_300Light',
  regular: 'Literata_400Regular',
  medium: 'Literata_500Medium',
  semibold: 'Literata_600SemiBold',
} as const;
