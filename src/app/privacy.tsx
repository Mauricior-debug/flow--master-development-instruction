import { BrandHeader, Card, Screen, T } from '../components/ui';
import { useTheme } from '../theme/Theme';

export default function PrivacyScreen() {
  const colors = useTheme();
  return (
    <Screen>
      <BrandHeader back />
      <T size={32} weight="bold">
        Privacy Policy
      </T>
      <T color={colors.muted} style={{ marginTop: 6, marginBottom: 16 }}>
        What PACE AI keeps, and what it does not publish.
      </T>
      <ViewBlock
        title="Your account"
        body="Email and a salted password hash stay on this device. PACE AI does not send them to an ad network."
      />
      <ViewBlock
        title="Location"
        body="A run records GPS points only after you start it. Routes are not published. You can export or delete them with your account."
      />
      <ViewBlock
        title="Camera and microphone"
        body="Both are optional. Core tracking works with location denied, and a camera note is a picture you chose to keep. It is not hazard detection."
      />
      <ViewBlock
        title="Deletion"
        body="Delete account removes your habits, check-ins, runs, messages, and settings from this device."
      />
    </Screen>
  );
}

function ViewBlock({ title, body }: { title: string; body: string }) {
  const colors = useTheme();
  return (
    <Card style={{ marginBottom: 12 }}>
      <T weight="bold">{title}</T>
      <T color={colors.muted} style={{ marginTop: 6 }}>
        {body}
      </T>
    </Card>
  );
}
