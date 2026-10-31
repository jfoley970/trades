import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createHouseCall } from '../api';
import { PrimaryButton } from '../components';
import { colors } from '../theme';
import { TRADES, type Trade } from '../types';
import { validateHouseCallForm, type FieldName } from '../validate';

export default function RequestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function clearError(field: FieldName) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function submit() {
    const nextErrors = validateHouseCallForm({ trade, description, address, contactName, phone });
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0 || !trade) return;
    setSubmitting(true);
    try {
      await createHouseCall({ trade, description, address, contactName, phone });
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save the house call.');
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.intro}>
          Tell us the trade, what’s wrong, and where to go. A licensed tech follows up. Video diagnosis comes later.
        </Text>

        <Text style={styles.label}>Trade</Text>
        <View style={styles.trades}>
          {TRADES.map((item) => {
            const selected = trade === item.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  setTrade(item.id);
                  clearError('trade');
                }}
                style={[styles.trade, selected && styles.tradeSelected]}
                testID={`trade-${item.id}`}
              >
                <Text style={styles.tradeLabel}>{item.label}</Text>
                <Text style={styles.tradeDetail}>{item.detail}</Text>
              </Pressable>
            );
          })}
        </View>
        {errors.trade ? <Text style={styles.fieldError}>{errors.trade}</Text> : null}

        <Field
          label="What’s going on"
          value={description}
          onChangeText={(value) => {
            setDescription(value);
            clearError('description');
          }}
          placeholder="The kitchen sink leaks under the cabinet."
          multiline
          error={errors.description}
          testID="field-description"
        />
        <Field
          label="Address"
          value={address}
          onChangeText={(value) => {
            setAddress(value);
            clearError('address');
          }}
          placeholder="Street address in Eagle County or along I-70"
          error={errors.address}
          testID="field-address"
          autoComplete="street-address"
        />
        <Field
          label="Your name"
          value={contactName}
          onChangeText={(value) => {
            setContactName(value);
            clearError('contactName');
          }}
          placeholder="Name we should ask for"
          error={errors.contactName}
          testID="field-name"
          autoComplete="name"
        />
        <Field
          label="Phone"
          value={phone}
          onChangeText={(value) => {
            setPhone(value);
            clearError('phone');
          }}
          placeholder="970-555-0100"
          error={errors.phone}
          testID="field-phone"
          keyboardType="phone-pad"
          autoComplete="tel"
        />

        {formError ? (
          <View style={styles.formError} testID="submit-error">
            <Text style={styles.formErrorText}>{formError}</Text>
          </View>
        ) : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <PrimaryButton
          label={submitting ? 'Sending…' : 'Submit request'}
          onPress={() => void submit()}
          disabled={submitting}
          testID="submit-request"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  multiline,
  testID,
  keyboardType,
  autoComplete,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  error?: string;
  multiline?: boolean;
  testID: string;
  keyboardType?: 'default' | 'phone-pad';
  autoComplete?: 'street-address' | 'name' | 'tel';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoComplete={autoComplete}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8A8478"
        style={[styles.input, multiline && styles.multiline]}
        testID={testID}
        textAlignVertical={multiline ? 'top' : 'center'}
        value={value}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.paper,
    flex: 1,
  },
  content: {
    gap: 4,
    padding: 20,
    paddingBottom: 24,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  intro: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  label: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 8,
  },
  trades: {
    gap: 8,
  },
  trade: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  tradeSelected: {
    backgroundColor: '#E7F3F1',
    borderColor: colors.tealBright,
    borderWidth: 2,
  },
  tradeLabel: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  tradeDetail: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  field: {
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multiline: {
    minHeight: 110,
  },
  fieldError: {
    color: colors.danger,
    fontSize: 13,
    marginTop: 6,
  },
  formError: {
    backgroundColor: colors.dangerBg,
    borderRadius: 12,
    marginTop: 12,
    padding: 12,
  },
  formErrorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
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
