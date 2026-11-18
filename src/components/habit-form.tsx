import { useState } from 'react';
import { View } from 'react-native';

import type { HabitInput } from '../data/store';
import type { Frequency, GoalType } from '../lib/engine';
import { useTheme } from '../theme/Theme';
import { Choice, ErrorText, Field, PrimaryButton, SecondaryButton, T, ToggleRow } from './ui';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIMES = ['07:00', '08:00', '12:30', '18:00', '21:00'];

export function HabitForm({
  initial,
  submitLabel,
  placeholder = 'e.g. Morning workout',
  loading,
  showCancel,
  onCancel,
  onSubmit,
}: {
  initial: HabitInput;
  submitLabel: string;
  placeholder?: string;
  loading?: boolean;
  showCancel?: boolean;
  onCancel?: () => void;
  onSubmit: (value: HabitInput) => void;
}) {
  const colors = useTheme();
  const [name, setName] = useState(initial.name);
  const [frequency, setFrequency] = useState<Frequency>(initial.frequency);
  const [customDays, setCustomDays] = useState<number[]>(initial.customDays);
  const [goalType, setGoalType] = useState<GoalType>(initial.goalType);
  const [reminder, setReminder] = useState(initial.reminder);
  const [reminderTime, setReminderTime] = useState(initial.reminderTime);
  const [error, setError] = useState('');

  function toggleDay(day: number) {
    setCustomDays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort()));
  }

  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 8 }}>
        <T weight="semibold">Habit name</T>
        <Field icon={initial.name ? 'create-outline' : 'star-outline'} value={name} onChangeText={setName} placeholder={placeholder} autoCapitalize="sentences" />
      </View>
      <View style={{ gap: 8 }}>
        <T weight="semibold">How often?</T>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Choice label="Daily" icon="calendar-outline" selected={frequency === 'daily'} onPress={() => setFrequency('daily')} />
          <Choice label="Weekly" icon="calendar-outline" selected={frequency === 'weekly'} onPress={() => setFrequency('weekly')} />
          <Choice label="Custom" icon="options-outline" selected={frequency === 'custom'} onPress={() => setFrequency('custom')} />
        </View>
        {frequency === 'weekly' ? (
          <T size={13} color={colors.muted}>
            A weekly habit stays on today’s list until you complete it once this week.
          </T>
        ) : null}
        {frequency === 'custom' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {DAYS.map((label, index) => {
              const selected = customDays.includes(index);
              return (
                <Choice key={label} label={label} icon="ellipse" selected={selected} onPress={() => toggleDay(index)} />
              );
            })}
          </View>
        ) : null}
      </View>
      <View style={{ gap: 8 }}>
        <T weight="semibold">Goal type</T>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Choice label="Build this habit" icon="sunny-outline" selected={goalType === 'build'} onPress={() => setGoalType('build')} wide />
          <Choice label="Break this habit" icon="close-circle-outline" selected={goalType === 'break'} onPress={() => setGoalType('break')} wide />
        </View>
      </View>
      <ToggleRow icon="notifications-outline" title="Daily reminder" detail="Get a reminder at a set time" value={reminder} onValueChange={setReminder} />
      {reminder ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TIMES.map((time) => (
            <Choice key={time} label={time} icon="time-outline" selected={reminderTime === time} onPress={() => setReminderTime(time)} />
          ))}
        </View>
      ) : null}
      <ErrorText>{error}</ErrorText>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {showCancel && onCancel ? (
          <View style={{ flex: 1 }}>
            <SecondaryButton label="Cancel" onPress={onCancel} />
          </View>
        ) : null}
        <View style={{ flex: showCancel ? 1.3 : 1 }}>
          <PrimaryButton
            label={submitLabel}
            loading={loading}
            onPress={() => {
              if (!name.trim()) {
                setError('Name the habit you want to track.');
                return;
              }
              if (frequency === 'custom' && customDays.length === 0) {
                setError('Choose at least one day for a custom habit.');
                return;
              }
              setError('');
              onSubmit({ name: name.trim(), frequency, customDays, goalType, reminder, reminderTime });
            }}
          />
        </View>
      </View>
    </View>
  );
}

export const emptyHabit: HabitInput = {
  name: '',
  frequency: 'daily',
  customDays: [],
  goalType: 'build',
  reminder: true,
  reminderTime: '08:00',
};
