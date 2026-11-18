import { View } from 'react-native';

import { BrandHeader, EmptyState, Screen, T } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { ago } from '../../../lib/engine';
import { useTheme } from '../../../theme/Theme';

export default function HistoryScreen() {
  const store = useAuthGuard();
  const colors = useTheme();
  const messages = store.user ? store.db.messages.filter((item) => item.userId === store.user?.id).slice().reverse() : [];
  return (
    <Screen tab>
      <BrandHeader back />
      <T size={32} weight="bold" style={{ marginBottom: 12 }}>Conversation History</T>
      {messages.length === 0 ? (
        <EmptyState title="No conversations yet" detail="Ask the coach during a run, or from the companion tab. Lines are saved on this device." />
      ) : (
        messages.map((message) => (
          <View key={message.id} style={{ backgroundColor: message.role === 'you' ? colors.limeDim : colors.surface, borderRadius: 16, padding: 14, marginBottom: 10 }}>
            <T size={12} weight="semibold" color={colors.muted}>{message.role === 'you' ? `You · ${ago(message.at)}` : `Coach · ${ago(message.at)}`}</T>
            <T style={{ marginTop: 4 }}>{message.text}</T>
          </View>
        ))
      )}
    </Screen>
  );
}
