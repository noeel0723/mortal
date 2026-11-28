import { useState } from 'react';
import { datingAgeOptions, datingProfileIssue, datingWorthOptions, playerDatingProfile } from '../src/engine/dating';
import type { DatingAppSource, DatingPreferences, DatingProfile } from '../src/engine/dating';
import { datingProfileIdentity, profileFields } from '../src/datingProfileView';
import type { Life } from '../src/engine/types';
import { estate } from '../src/engine/wealth';
import { en, money } from '../src/i18n/en';
import { datingApps } from '../src/socialView';
import { DetailDialog } from './detailDialog';
import { useGame } from './browserStore';
import { Portrait } from './portraits';
import { Button, Rows } from './ui';

export function DatingDialog({ source, life, busy, onClose, search }: {
  source: DatingAppSource; life: Life; busy: boolean; onClose: () => void; search: (preferences: DatingPreferences) => void;
}) {
  const [preferences, setPreferences] = useState<DatingPreferences>(() => {
    const { age, netWorth } = playerDatingProfile(life);
    return { age, netWorth };
  });
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
      <Button type="submit" icon="search" kind="primary" disabled={busy}>Find a Profile</Button>
    </form>
  </DetailDialog>;
}

export function DatingProfileForm({ life }: { life: Life }) {
  const { busy, dispatch } = useGame();
  const current = playerDatingProfile(life);
  const [profile, setProfile] = useState<DatingProfile>(current);
  const { name, occupation, interests } = datingProfileIdentity(life);
  const issue = datingProfileIssue(life);
  const saved = !!life.social.datingProfile && profileFields.every(({ key }) => profile[key] === current[key]);
  return <div className="play-group-content">
    <div className="event-identity">
      <Portrait appearance={life.character.appearance} age={life.character.age} label="Your portrait" />
      <div><strong>{name}</strong><span>{en.age(life.character.age)} · {occupation} · {life.character.city}</span></div>
    </div>
    {interests.length > 0 && <Rows items={[{ label: 'Your Interests', value: interests.join(', ') }]} />}
    <form className="field-grid personal-care-form dating-filters" onSubmit={(event) => {
      event.preventDefault();
      if (!busy && !issue && !saved) void dispatch({ type: 'dating-profile', profile });
    }}>
      {profileFields.map(({ key, label, options }) => <label key={key}>{label}
        <select disabled={!!issue} value={profile[key]} onChange={(event) => setProfile({ ...profile, [key]: event.target.value })}>
          {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </label>)}
      {issue && <p>{issue}</p>}
      <Button type="submit" icon="accept" kind="primary" disabled={busy || !!issue || saved}>{saved ? 'Profile Saved' : 'Save Profile'}</Button>
    </form>
  </div>;
}
