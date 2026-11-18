import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BrandHeader, Card, EmptyState, Field, PrimaryButton, Screen, T } from '../../../components/ui';
import { useAuthGuard } from '../../../components/ui';
import { useTheme } from '../../../theme/Theme';

export default function FriendsScreen() {
  const store = useAuthGuard();
  const colors = useTheme();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const friends = store.user ? store.db.friends.filter((item) => item.userId === store.user?.id) : [];
  return (
    <Screen tab>
      <BrandHeader back />
      <T size={32} weight="bold">Friends</T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 16 }}>Names stay on this device. Adding someone does not share your routes.</T>
      <Field icon="person-outline" value={name} onChangeText={setName} placeholder="Name" autoCapitalize="words" />
      {error ? <T color={colors.danger} style={{ marginTop: 8 }}>{error}</T> : null}
      <View style={{ marginTop: 12 }}>
        <PrimaryButton
          label="Add friend"
          onPress={() => {
            const result = store.addFriend(name);
            if (!result.ok) setError(result.error);
            else {
              setError('');
              setName('');
            }
          }}
        />
      </View>
      <View style={{ marginTop: 18 }}>
        {friends.length === 0 ? (
          <EmptyState title="No friends yet" detail="Add someone you train with. They will not appear with made-up mileage." />
        ) : (
          friends.map((friend) => (
            <Card key={friend.id} style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <T weight="bold">{friend.name}</T>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${friend.name}`} onPress={() => store.removeFriend(friend.id)} style={({ pressed }) => [{ minHeight: 44, justifyContent: 'center' }, pressed && { opacity: 0.6 }]}>
                <T color={colors.danger} weight="semibold">Remove</T>
              </Pressable>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}
