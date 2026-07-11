import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { DEFAULT_VERSION, VersionId } from '../services/bibleApi';
import { Theme, ThemeName, themes } from '../constants/theme';

export type VerseLayout = 'corrido' | 'bloco';

export interface Settings {
  theme: ThemeName;
  fontSize: number;
  showVerseNumbers: boolean;
  verseLayout: VerseLayout;
  version: VersionId;
}

export interface Favorite {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  version: VersionId;
  addedAt: number;
}

export interface LastRead {
  book: string;
  chapter: number;
}

export interface Profile {
  name: string;
}

/** Registro local de leitura — alimenta as estatísticas do perfil. */
export interface ReadingLog {
  /** Capítulos já lidos, como "jo:3". */
  chapters: string[];
  /** Dias com leitura, como "2026-07-11" (fuso local). */
  days: string[];
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  fontSize: 19,
  showVerseNumbers: true,
  verseLayout: 'corrido',
  version: DEFAULT_VERSION,
};

// Como no protótipo do design: sem histórico ainda, sugere João 3.
const DEFAULT_LAST_READ: LastRead = { book: 'jo', chapter: 3 };

const KEYS = {
  settings: '@biblia:settings',
  favorites: '@biblia:favorites',
  lastRead: '@biblia:lastRead',
  profile: '@biblia:profile',
  readingLog: '@biblia:readingLog',
} as const;

/** Data local como "YYYY-MM-DD". */
export function dayKey(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

interface AppContextValue {
  ready: boolean;
  settings: Settings;
  theme: Theme;
  favorites: Favorite[];
  lastRead: LastRead;
  profile: Profile;
  readingLog: ReadingLog;
  updateSettings: (patch: Partial<Settings>) => void;
  toggleTheme: () => void;
  /** Retorna true se o versículo foi adicionado, false se foi removido. */
  toggleFavorite: (fav: Omit<Favorite, 'addedAt'>) => boolean;
  isFavorite: (book: string, chapter: number, verse: number) => boolean;
  setLastRead: (lastRead: LastRead) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  /** Marca um capítulo como lido hoje (para sequência e estatísticas). */
  logChapterRead: (book: string, chapter: number) => void;
  /**
   * Mescla dados vindos da nuvem (Supabase) com os locais e retorna o
   * resultado — favoritos e registro de leitura por união; o nome local
   * prevalece quando preenchido.
   */
  importRemote: (data: {
    favorites?: Favorite[];
    readingLog?: ReadingLog;
    profile?: Profile;
  }) => { favorites: Favorite[]; readingLog: ReadingLog; profile: Profile };
}

const AppContext = createContext<AppContextValue | null>(null);

async function persist(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // persistência é melhor esforço
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [lastRead, setLastReadState] = useState<LastRead>(DEFAULT_LAST_READ);
  const [profile, setProfile] = useState<Profile>({ name: '' });
  const [readingLog, setReadingLog] = useState<ReadingLog>({ chapters: [], days: [] });

  useEffect(() => {
    (async () => {
      try {
        const entries = await AsyncStorage.multiGet([
          KEYS.settings,
          KEYS.favorites,
          KEYS.lastRead,
          KEYS.profile,
          KEYS.readingLog,
        ]);
        const [storedSettings, storedFavorites, storedLastRead, storedProfile, storedLog] =
          entries.map(([, v]) => v);
        if (storedSettings) {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) });
        }
        if (storedFavorites) {
          const favs = JSON.parse(storedFavorites);
          if (Array.isArray(favs)) setFavorites(favs);
        }
        if (storedLastRead) {
          const lr = JSON.parse(storedLastRead);
          if (lr && typeof lr.book === 'string') setLastReadState(lr);
        }
        if (storedProfile) {
          const p = JSON.parse(storedProfile);
          if (p && typeof p.name === 'string') setProfile(p);
        }
        if (storedLog) {
          const log = JSON.parse(storedLog);
          if (log && Array.isArray(log.chapters) && Array.isArray(log.days)) {
            setReadingLog(log);
          }
        }
      } catch {
        // dados corrompidos — segue com os padrões
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      void persist(KEYS.settings, next);
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setSettings((prev) => {
      const next: Settings = {
        ...prev,
        theme: prev.theme === 'dark' ? 'light' : 'dark',
      };
      void persist(KEYS.settings, next);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback(
    (fav: Omit<Favorite, 'addedAt'>): boolean => {
      let added = false;
      setFavorites((prev) => {
        const idx = prev.findIndex(
          (f) =>
            f.book === fav.book && f.chapter === fav.chapter && f.verse === fav.verse
        );
        let next: Favorite[];
        if (idx >= 0) {
          next = prev.filter((_, i) => i !== idx);
        } else {
          added = true;
          next = [{ ...fav, addedAt: Date.now() }, ...prev];
        }
        void persist(KEYS.favorites, next);
        return next;
      });
      return added;
    },
    []
  );

  const isFavorite = useCallback(
    (book: string, chapter: number, verse: number) =>
      favorites.some(
        (f) => f.book === book && f.chapter === chapter && f.verse === verse
      ),
    [favorites]
  );

  const setLastRead = useCallback((lr: LastRead) => {
    setLastReadState(lr);
    void persist(KEYS.lastRead, lr);
  }, []);

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      void persist(KEYS.profile, next);
      return next;
    });
  }, []);

  const importRemote = useCallback(
    (data: {
      favorites?: Favorite[];
      readingLog?: ReadingLog;
      profile?: Profile;
    }) => {
      const favKey = (f: Favorite) => `${f.book}:${f.chapter}:${f.verse}`;
      const mergedFavs = [...favorites];
      const seen = new Set(favorites.map(favKey));
      for (const f of data.favorites ?? []) {
        if (
          f &&
          typeof f.book === 'string' &&
          typeof f.chapter === 'number' &&
          typeof f.verse === 'number' &&
          !seen.has(favKey(f))
        ) {
          seen.add(favKey(f));
          mergedFavs.push(f);
        }
      }
      mergedFavs.sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));

      const mergedLog: ReadingLog = {
        chapters: Array.from(
          new Set([...readingLog.chapters, ...(data.readingLog?.chapters ?? [])])
        ),
        days: Array.from(new Set([...readingLog.days, ...(data.readingLog?.days ?? [])])),
      };

      const mergedProfile: Profile = {
        name: profile.name.trim() ? profile.name : data.profile?.name ?? '',
      };

      setFavorites(mergedFavs);
      setReadingLog(mergedLog);
      setProfile(mergedProfile);
      void persist(KEYS.favorites, mergedFavs);
      void persist(KEYS.readingLog, mergedLog);
      void persist(KEYS.profile, mergedProfile);

      return { favorites: mergedFavs, readingLog: mergedLog, profile: mergedProfile };
    },
    [favorites, readingLog, profile]
  );

  const logChapterRead = useCallback((book: string, chapter: number) => {
    const chapterId = `${book}:${chapter}`;
    const today = dayKey();
    setReadingLog((prev) => {
      const hasChapter = prev.chapters.includes(chapterId);
      const hasDay = prev.days.includes(today);
      if (hasChapter && hasDay) return prev;
      const next: ReadingLog = {
        chapters: hasChapter ? prev.chapters : [...prev.chapters, chapterId],
        days: hasDay ? prev.days : [...prev.days, today],
      };
      void persist(KEYS.readingLog, next);
      return next;
    });
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      settings,
      theme: themes[settings.theme],
      favorites,
      lastRead,
      profile,
      readingLog,
      updateSettings,
      toggleTheme,
      toggleFavorite,
      isFavorite,
      setLastRead,
      updateProfile,
      logChapterRead,
      importRemote,
    }),
    [
      ready,
      settings,
      favorites,
      lastRead,
      profile,
      readingLog,
      updateSettings,
      toggleTheme,
      toggleFavorite,
      isFavorite,
      setLastRead,
      updateProfile,
      logChapterRead,
      importRemote,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp deve ser usado dentro de <AppProvider>');
  return ctx;
}

export function useTheme(): Theme {
  return useApp().theme;
}
