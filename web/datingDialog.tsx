import { useState } from 'react';
import { datingAgeOptions, datingWorthOptions, defaultDatingPreferences } from '../src/engine/dating';
import type { DatingAppSource, DatingPreferences } from '../src/engine/dating';
import type { Life } from '../src/engine/types';
import { estate } from '../src/engine/wealth';
import { money } from '../src/i18n/en';
import { datingApps } from '../src/socialView';
import { DetailDialog } from './detailDialog';
import { Button, Rows } from './ui';

export function DatingDialog({ source, life, busy, onClose, search }: {
  source: DatingAppSource; life: Life; busy: boolean; onClose: () => void; search: (preferences: DatingPreferences) => void;
}) {
  const [preferences, setPreferences] = useState(defaultDatingPreferences);
  return <DetailDialog title={datingApps[source].label} onDismiss={onClose}>
    <form className="field-grid dating-filters" onSubmit={(event) => {
      event.preventDefault();
      if (!busy) search(preferences);
    }}>
      <Rows items={[{ label: 'Your Net Worth', value: money(estate(life).total) }]} />
      <label>Preferred Age
        <select value={preferences.age} onChange={(event) => setPreferences({ ...preferences, age: event.target.value as DatingPreferences['age'] })}>
          {Object.entries(datingAgeOptions).map(([id, { label }]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      <label>Preferred Net Worth
        <select value={preferences.netWorth} onChange={(event) => setPreferences({ ...preferences, netWorth: event.target.value as DatingPreferences['netWorth'] })}>
          {Object.entries(datingWorthOptions).map(([id, { label }]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      <Button type="submit" icon="search" kind="primary" disabled={busy}>Find a Match</Button>
    </form>
  </DetailDialog>;
}
