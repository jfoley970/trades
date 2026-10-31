import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listHouseCalls } from '../api';
import { Banner, PrimaryButton } from '../components';
import { colors } from '../theme';
import { LOGIN_MISSING_NOTE, stateLabel, tradeLabel, type HouseCall } from '../types';

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function HouseCallListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const requestId = useRef(0);
  const [houseCalls, setHouseCalls] = useState<HouseCall[] | null>(null);
  const [authNote, setAuthNote] = useState(LOGIN_MISSING_NOTE);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const result = await listHouseCalls();
      if (id !== requestId.current) return;
      setHouseCalls(result.houseCalls);
      setAuthNote(result.authNote);
      setError(null);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof Error ? err.message : 'Could not load house calls.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const loading = houseCalls === null && error === null;
  const empty = houseCalls !== null && houseCalls.length === 0 && error === null;
  const showRequest = error === null || houseCalls !== null;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.teal} />}
      >
        <Text style={styles.kicker}>House calls</Text>
        <Text style={styles.intro}>Small visits from a licensed plumber, electrician, or HVAC tech.</Text>
        <Banner note={authNote} />

        {loading ? (
          <View style={styles.statusBlock}>
            <ActivityIndicator color={colors.teal} />
            <Text style={styles.statusText}>Looking for house calls…</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard} testID="load-error">
            <Text style={styles.errorTitle}>Couldn’t load house calls</Text>
            <Text style={styles.errorBody}>{error}</Text>
            <PrimaryButton label="Try again" onPress={() => void load()} testID="retry-load" />
          </View>
        ) : null}

        {empty ? (
          <View style={styles.empty} testID="empty-state">
            <View style={styles.mark}>
              <Text style={styles.markText}>TD</Text>
            </View>
            <Text accessibilityRole="header" style={styles.emptyTitle}>
              No house calls yet
            </Text>
            <Text style={styles.emptyBody}>
              When a sink leaks, a breaker trips, or the heat quits, request a visit. Nothing is on the list until you
              send one.
            </Text>
            <Text style={styles.emptyTrades}>Plumber · Electrician · HVAC</Text>
          </View>
        ) : null}

        {houseCalls && houseCalls.length > 0 ? (
          <View testID="house-call-list">
            {houseCalls.map((call) => (
              <View key={call.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.trade}>{tradeLabel(call.trade)}</Text>
                  <Text style={styles.pill}>{stateLabel(call.state)}</Text>
                </View>
                <Text style={styles.description}>{call.description}</Text>
                <Text style={styles.address}>{call.address}</Text>
                <Text style={styles.meta}>
                  {formatWhen(call.createdAt)} · {call.contactName} · {call.phone}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {showRequest ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <PrimaryButton
            label="Request a house call"
            onPress={() => router.push('/request')}
            testID="request-house-call"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.paper,
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: 16,
    padding: 20,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  kicker: {
    color: colors.teal,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  intro: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    marginTop: -8,
  },
  statusBlock: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 28,
  },
  statusText: {
    color: colors.muted,
    fontSize: 15,
  },
  errorCard: {
    backgroundColor: colors.dangerBg,
    borderRadius: 16,
    gap: 12,
    padding: 16,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 17,
    fontWeight: '700',
  },
  errorBody: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 21,
  },
  empty: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  mark: {
    alignItems: 'center',
    backgroundColor: colors.teal,
    borderRadius: 44,
    height: 88,
    justifyContent: 'center',
    marginBottom: 16,
    width: 88,
  },
  markText: {
    color: colors.cream,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 1,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyTrades: {
    color: colors.tealBright,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 14,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  cardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  trade: {
    color: colors.teal,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  pill: {
    backgroundColor: colors.pill,
    borderRadius: 999,
    color: colors.teal,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  description: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 22,
  },
  address: {
    color: colors.ink,
    fontSize: 15,
    marginTop: 8,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 8,
  },
  footer: {
    backgroundColor: colors.paper,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
});
