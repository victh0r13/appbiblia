import type { Session } from '@supabase/supabase-js';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getSupabase, isSupabaseConfigured, translateAuthError } from '../services/supabase';
import { Favorite, Profile, ReadingLog, useApp } from './AppContext';

/**
 * Conta e sincronização entre aparelhos (Supabase).
 *
 * Fica inerte enquanto o Supabase não estiver configurado no .env —
 * o app continua totalmente local. Com sessão ativa:
 * - no login: baixa os dados da nuvem, mescla com os locais e sobe o resultado;
 * - depois: qualquer mudança em favoritos/leitura/perfil sobe com debounce.
 */

interface RemoteRow {
  favorites: Favorite[] | null;
  reading_log: ReadingLog | null;
  profile: Profile | null;
}

interface AccountContextValue {
  /** false = Supabase ainda não configurado no .env (modo 100% local). */
  configured: boolean;
  session: Session | null;
  /** Ação de auth em andamento (entrar/criar conta/sair). */
  busy: boolean;
  syncing: boolean;
  lastSyncAt: number | null;
  /** Retornam mensagem de erro em pt-BR, ou null em caso de sucesso. */
  signIn: (email: string, password: string) => Promise<string | null>;
  /** No sucesso pode retornar um AVISO (ex.: confirmar e-mail) em `notice`. */
  signUp: (email: string, password: string) => Promise<{ error: string | null; notice?: string }>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<string | null>;
}

const AccountContext = createContext<AccountContextValue>({
  configured: false,
  session: null,
  busy: false,
  syncing: false,
  lastSyncAt: null,
  signIn: async () => 'Supabase não configurado.',
  signUp: async () => ({ error: 'Supabase não configurado.' }),
  signOut: async () => {},
  syncNow: async () => 'Supabase não configurado.',
});

const PUSH_DEBOUNCE_MS = 2500;

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { ready, favorites, readingLog, profile, importRemote } = useApp();
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Evita que o push automático dispare durante o merge inicial do login.
  const pulledForUser = useRef<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) pulledForUser.current = null;
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const push = useCallback(
    async (data: { favorites: Favorite[]; readingLog: ReadingLog; profile: Profile }) => {
      const supabase = getSupabase();
      const uid = session?.user.id;
      if (!supabase || !uid) return 'Sem sessão ativa.';
      const { error } = await supabase.from('user_data').upsert({
        user_id: uid,
        favorites: data.favorites,
        reading_log: data.readingLog,
        profile: data.profile,
        updated_at: new Date().toISOString(),
      });
      return error ? translateAuthError(error.message) : null;
    },
    [session]
  );

  /** Baixa, mescla e sobe — usado no login e no botão "Sincronizar agora". */
  const syncNow = useCallback(async (): Promise<string | null> => {
    const supabase = getSupabase();
    const uid = session?.user.id;
    if (!supabase || !uid) return 'Sem sessão ativa.';
    setSyncing(true);
    try {
      const { data, error } = await supabase
        .from('user_data')
        .select('favorites, reading_log, profile')
        .eq('user_id', uid)
        .maybeSingle<RemoteRow>();
      if (error) return translateAuthError(error.message);
      const merged = importRemote({
        favorites: data?.favorites ?? undefined,
        readingLog: data?.reading_log ?? undefined,
        profile: data?.profile ?? undefined,
      });
      const pushError = await push(merged);
      if (pushError) return pushError;
      pulledForUser.current = uid;
      setLastSyncAt(Date.now());
      return null;
    } catch {
      return 'Sem conexão com o servidor. Tente novamente.';
    } finally {
      setSyncing(false);
    }
  }, [session, importRemote, push]);

  // Sincronização completa ao estabelecer sessão (login ou retorno ao app).
  useEffect(() => {
    if (!ready || !session) return;
    if (pulledForUser.current === session.user.id) return;
    void syncNow();
  }, [ready, session, syncNow]);

  // Push automático (com debounce) quando os dados locais mudam.
  useEffect(() => {
    if (!session || pulledForUser.current !== session.user.id) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      void push({ favorites, readingLog, profile }).then((err) => {
        if (!err) setLastSyncAt(Date.now());
      });
    }, PUSH_DEBOUNCE_MS);
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [favorites, readingLog, profile, session, push]);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) return 'Supabase não configurado.';
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      return error ? translateAuthError(error.message) : null;
    } catch {
      return 'Sem conexão com o servidor. Tente novamente.';
    } finally {
      setBusy(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase não configurado.' };
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) return { error: translateAuthError(error.message) };
      if (!data.session) {
        return {
          error: null,
          notice: 'Conta criada! Confirme seu e-mail para entrar.',
        };
      }
      return { error: null };
    } catch {
      return { error: 'Sem conexão com o servidor. Tente novamente.' };
    } finally {
      setBusy(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    try {
      // Sobe o estado atual antes de sair, para não perder nada.
      if (session && pulledForUser.current === session.user.id) {
        await push({ favorites, readingLog, profile });
      }
      await supabase.auth.signOut();
    } catch {
      // sessão local é limpa mesmo se a rede falhar
    } finally {
      setBusy(false);
    }
  }, [session, push, favorites, readingLog, profile]);

  const value = useMemo<AccountContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      session,
      busy,
      syncing,
      lastSyncAt,
      signIn,
      signUp,
      signOut,
      syncNow,
    }),
    [session, busy, syncing, lastSyncAt, signIn, signUp, signOut, syncNow]
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  return useContext(AccountContext);
}
