import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  TextStyle,
  StyleProp,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApp } from "./store";
import { typography } from "./theme";
import { translate } from "./i18n";
export function Txt({
  children,
  size = typography.body,
  color,
  style,
  ...props
}: {
  children: React.ReactNode;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
  [key: string]: any;
}) {
  const { palette: p, scale, settings } = useApp();
  return (
    <Text
      {...props}
      style={[
        {
          color: color || p.body,
          fontSize: size * scale,
          lineHeight: size * scale * 1.45,
        },
        style,
      ]}
    >
      {typeof children === "string"
        ? translate(children, settings.language)
        : children}
    </Text>
  );
}
export function Screen({
  children,
  title,
  kicker = "BANGI · A MOMENT OF PEACE",
}: {
  children: React.ReactNode;
  title: string;
  kicker?: string;
}) {
  const { palette: p, settings, error, setError, notice, setNotice } = useApp();
  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: p.background }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 24,
          gap: 20,
          width: "100%",
          maxWidth: 780,
          alignSelf: "center",
          paddingBottom: 48,
          direction: settings.language === "ar" ? "rtl" : "ltr",
        }}
      >
        <View style={{ paddingVertical: 12, gap: 6 }}>
          <Txt size={11} color={p.accent} style={{ letterSpacing: 2 }}>
            {kicker}
          </Txt>
          <Txt
            size={typography.heading}
            color={p.heading}
            style={{
              fontWeight: "600",
              fontFamily: Platform.select({
                ios: "Georgia",
                android: "serif",
                default: "Georgia, serif",
              }),
            }}
          >
            {title}
          </Txt>
        </View>
        {!!notice && (
          <Card selected>
            <Txt accessibilityLiveRegion="polite">{notice}</Txt>
            <Button
              label="Dismiss reminder"
              secondary
              onPress={() => setNotice("")}
            />
          </Card>
        )}
        {!!error && (
          <Card>
            <Txt color={p.notification}>{error}</Txt>
            <Button label="Dismiss" onPress={() => setError("")} />
          </Card>
        )}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Card({
  children,
  selected = false,
}: {
  children: React.ReactNode;
  selected?: boolean;
}) {
  const { palette: p } = useApp();
  return (
    <View
      style={{
        backgroundColor: selected ? p.selectedCard : p.surface,
        borderRadius: 22,
        padding: 20,
        gap: 12,
        borderWidth: 1,
        borderColor: p.border,
      }}
    >
      {children}
    </View>
  );
}
export function Button({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  const { palette: p, settings } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={translate(label, settings.language)}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: secondary ? p.surface : p.button,
        borderWidth: 1,
        borderColor: p.border,
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        justifyContent: "center",
      })}
    >
      <Txt
        color={secondary ? p.text : p.buttonText}
        style={{ fontWeight: "600", textAlign: "center" }}
      >
        {label}
      </Txt>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChange,
  keyboardType = "default",
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: "default" | "numeric";
  multiline?: boolean;
}) {
  const { palette: p, scale } = useApp();
  return (
    <View style={{ gap: 6 }}>
      <Txt size={13} color={p.secondaryText}>
        {label}
      </Txt>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        multiline={multiline}
        placeholderTextColor={p.secondaryText}
        style={{
          color: p.text,
          backgroundColor: p.background,
          borderColor: p.border,
          borderWidth: 1,
          borderRadius: 12,
          padding: 13,
          minHeight: 48,
          fontSize: 16 * scale,
        }}
      />
    </View>
  );
}
export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { palette: p } = useApp();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        minHeight: 48,
      }}
    >
      <Txt style={{ flex: 1 }}>{label}</Txt>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: p.accent, false: p.border }}
      />
    </View>
  );
}
export function Choices<T extends string>({
  values,
  value,
  onChange,
}: {
  values: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {values.map((v) => (
        <Button
          key={v}
          label={v}
          secondary={v !== value}
          onPress={() => onChange(v)}
        />
      ))}
    </View>
  );
}
export function Row({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      {children}
    </View>
  );
}
