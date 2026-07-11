import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

/**
 * Cliente Supabase para conta e sincronização entre aparelhos.
 *
 * O app funciona 100% local sem isso. Para ativar:
 * 1. Crie um projeto gratuito em https://supabase.com
 * 2. Rode o SQL de `supabase/schema.sql` no SQL Editor do painel
 * 3. Copie `.env.example` para `.env` e preencha URL e anon key
 *    (Painel → Settings → API)
 * 4. Reinicie o `npx expo start`
 */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = url.startsWith('http') && anonKey.length > 20;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    // Renova o token só com o app em primeiro plano (recomendação do Supabase).
    AppState.addEventListener('change', (state) => {
      if (!client) return;
      if (state === 'active') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    });
  }
  return client;
}

/** Traduz os erros de auth mais comuns para pt-BR. */
export function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('user already registered')) return 'Este e-mail já tem uma conta.';
  if (m.includes('password should be at least'))
    return 'A senha precisa ter pelo menos 6 caracteres.';
  if (m.includes('unable to validate email') || m.includes('invalid email'))
    return 'E-mail inválido.';
  if (m.includes('email not confirmed'))
    return 'Confirme seu e-mail antes de entrar (verifique a caixa de entrada).';
  if (m.includes('network') || m.includes('fetch'))
    return 'Sem conexão com o servidor. Tente novamente.';
  return message;
}
