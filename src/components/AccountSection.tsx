import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAccount } from '../store/AccountContext';
import { useApp } from '../store/AppContext';
import { useToast } from './Toast';
import { Card, Eyebrow } from './ui';

/**
 * Seção "Conta e sincronização" do Perfil.
 * - Sem Supabase configurado: explica como ativar (o código já está pronto).
 * - Configurado e deslogado: entrar / criar conta com e-mail e senha.
 * - Logado: status da sincronização, sincronizar agora e sair.
 */
export function AccountSection() {
  const { theme } = useApp();
  const { configured, session, busy, syncing, lastSyncAt, signIn, signUp, signOut, syncNow } =
    useAccount();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const canSubmit = email.trim().length >= 5 && password.length >= 6 && !busy;

  const handleSignIn = async () => {
    setMessage(null);
    const error = await signIn(email, password);
    if (error) setMessage(error);
    else {
      setEmail('');
      setPassword('');
      showToast('Conectado — sincronizando…');
    }
  };

  const handleSignUp = async () => {
    setMessage(null);
    const { error, notice } = await signUp(email, password);
    if (error) setMessage(error);
    else if (notice) setMessage(notice);
    else {
      setEmail('');
      setPassword('');
      showToast('Conta criada — sincronizando…');
    }
  };

  const handleSync = async () => {
    const error = await syncNow();
    showToast(error ?? 'Dados sincronizados');
  };

  const handleSignOut = async () => {
    await signOut();
    showToast('Você saiu da conta (dados locais preservados)');
  };

  return (
    <View>
      <Eyebrow style={{ marginTop: 22, marginBottom: 10 }}>Conta e sincronização</Eyebrow>

      {!configured && (
        <Card style={styles.card}>
          <View style={[styles.pill, { backgroundColor: theme.accFaint }]}>
            <Feather name="cloud-off" size={11} color={theme.acc} />
            <Eyebrow color={theme.acc} style={{ fontSize: 10 }}>
              Pronto para ativar
            </Eyebrow>
          </View>
          <Text style={[styles.body, { color: theme.sub }]}>
            O código de contas já está integrado — falta só apontar para um projeto
            Supabase (gratuito):{'\n'}
            1. Crie um projeto em supabase.com{'\n'}
            2. Rode o SQL de supabase/schema.sql no SQL Editor{'\n'}
            3. Copie .env.example para .env e preencha URL e anon key{'\n'}
            4. Reinicie o Expo — os campos de login aparecem aqui.
          </Text>
          <Text style={[styles.body, { color: theme.sub, marginTop: 8 }]}>
            Enquanto isso, tudo continua funcionando localmente.
          </Text>
        </Card>
      )}

      {configured && !session && (
        <Card style={styles.card}>
          <Text style={[styles.body, { color: theme.sub, marginBottom: 12 }]}>
            Entre para sincronizar favoritos, progresso e perfil entre aparelhos.
          </Text>
          <View
            style={[styles.inputWrap, { backgroundColor: theme.bg, borderColor: theme.line }]}
          >
            <Feather name="mail" size={15} color={theme.sub} />
            <TextInput
              style={[styles.input, { color: theme.ink }]}
              placeholder="E-mail"
              placeholderTextColor={theme.sub}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
          </View>
          <View
            style={[styles.inputWrap, { backgroundColor: theme.bg, borderColor: theme.line }]}
          >
            <Feather name="lock" size={15} color={theme.sub} />
            <TextInput
              style={[styles.input, { color: theme.ink }]}
              placeholder="Senha (mín. 6 caracteres)"
              placeholderTextColor={theme.sub}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {message && (
            <Text style={[styles.message, { color: theme.acc }]}>{message}</Text>
          )}

          <View style={styles.btnRow}>
            <Pressable
              onPress={handleSignIn}
              disabled={!canSubmit}
              style={[
                styles.btnPrimary,
                { backgroundColor: theme.acc },
                !canSubmit && { opacity: 0.45 },
              ]}
            >
              {busy ? (
                <ActivityIndicator size="small" color={theme.bg} />
              ) : (
                <Text style={[styles.btnPrimaryLabel, { color: theme.bg }]}>Entrar</Text>
              )}
            </Pressable>
            <Pressable
              onPress={handleSignUp}
              disabled={!canSubmit}
              style={[
                styles.btnGhost,
                { borderColor: theme.line },
                !canSubmit && { opacity: 0.45 },
              ]}
            >
              <Text style={[styles.btnGhostLabel, { color: theme.ink }]}>Criar conta</Text>
            </Pressable>
          </View>
        </Card>
      )}

      {configured && session && (
        <Card style={styles.card}>
          <View style={styles.userRow}>
            <Feather name="cloud" size={16} color={theme.acc} />
            <Text style={[styles.email, { color: theme.ink }]} numberOfLines={1}>
              {session.user.email}
            </Text>
          </View>
          <Text style={[styles.body, { color: theme.sub }]}>
            {syncing
              ? 'Sincronizando…'
              : lastSyncAt
                ? `Última sincronização: ${new Date(lastSyncAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                : 'Sincronização automática ativa.'}
          </Text>
          <View style={styles.btnRow}>
            <Pressable
              onPress={handleSync}
              disabled={syncing}
              style={[
                styles.btnPrimary,
                { backgroundColor: theme.acc },
                syncing && { opacity: 0.45 },
              ]}
            >
              {syncing ? (
                <ActivityIndicator size="small" color={theme.bg} />
              ) : (
                <Text style={[styles.btnPrimaryLabel, { color: theme.bg }]}>
                  Sincronizar agora
                </Text>
              )}
            </Pressable>
            <Pressable
              onPress={handleSignOut}
              disabled={busy}
              style={[styles.btnGhost, { borderColor: theme.line }, busy && { opacity: 0.45 }]}
            >
              <Text style={[styles.btnGhostLabel, { color: theme.ink }]}>Sair</Text>
            </Pressable>
          </View>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
  body: {
    fontSize: 12.5,
    lineHeight: 20,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    height: '100%',
    paddingVertical: 0,
  },
  message: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  btnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    minWidth: 110,
  },
  btnPrimaryLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  btnGhost: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  btnGhostLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  email: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
});
