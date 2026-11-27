import { useState } from 'react';
import type { FormEvent } from 'react';
import { backgrounds, backgroundLabels, cities, country, defaultBirthYear, firstBirthYear, genders, genderLabels, lastBirthYear, talents, talentLabels } from '../src/data/veyra';
import type { ProfileInput, Talent } from '../src/engine/types';
import { en } from '../src/i18n/en';
import { useGame } from './browserStore';
import { Button, Feedback, Heading, Icon, Mark, Rows } from './ui';

export function Welcome({ onOpen, navigate }: { onOpen: (id: string) => void; navigate: (page: string) => void }) {
  const { ready, saves, busy, problem, initialize } = useGame();
  const recent = saves[0];
  return (
    <main className="welcome-grid" id="main">
      <section className="hero" aria-labelledby="mortal-title">
        <div className="orbit orbit--outer" aria-hidden="true" />
        <div className="orbit orbit--middle" aria-hidden="true" />
        <div className="orbit orbit--inner" aria-hidden="true" />
        <div className="orbit-node orbit-node--large" aria-hidden="true" />
        <div className="orbit-node orbit-node--small" aria-hidden="true" />
        <Mark className="hero-mark" />
        <h1 id="mortal-title">{en.title}</h1>
        <p>{en.tagline}</p>
      </section>
      <section className="welcome-actions" aria-labelledby="your-life">
        <div className="welcome-intro">
          <h2 id="your-life">Your life in Veyra</h2>
          <p>Start at birth, make your own choices, and see where life takes you.</p>
        </div>
        {recent && <div className="recent">
          <span>Most recent life</span>
          <strong>{recent.name}</strong>
          <small>{recent.completed ? 'Completed' : en.age(recent.age)} · {recent.city}</small>
        </div>}
        <div className="action-stack">
          <Button icon="continue" kind={recent ? 'primary' : 'plain'} disabled={!recent || busy}
            onClick={() => { if (recent) onOpen(recent.id); }}>{en.continueLife}</Button>
          <Button icon="new" kind={recent ? 'plain' : 'primary'} disabled={!ready || busy} onClick={() => navigate('new')}>{en.newLife}</Button>
        </div>
        <div className="menu-shortcuts">
          <Button icon="load" kind="quiet" onClick={() => navigate('saves')}>Saved Lives</Button>
          <Button icon="trophy" kind="quiet" onClick={() => navigate('achievements')}>Achievements</Button>
          <Button icon="settings" kind="quiet" onClick={() => navigate('settings')}>Settings</Button>
        </div>
        <Feedback error={problem} />
        {!ready && problem && <Button icon="load" disabled={busy} onClick={() => void initialize()}>Retry loading saves</Button>}
      </section>
    </main>
  );
}

export function NewLife({ start, customize }: { start: () => void; customize: () => void }) {
  const { ready, busy, problem } = useGame();
  return (
    <main className="inner" id="main">
      <Heading title="New Life" detail="Choose how your story begins." />
      <div className="mode-grid">
        <section className="surface mode">
          <Icon name="random" />
          <h2>Random Life</h2><p>Discover your name, family, and hometown when you’re born.</p>
          <Button icon="random" kind="primary" disabled={!ready || busy} onClick={start}>Start Random Life</Button>
        </section>
        <section className="surface mode">
          <Icon name="custom" />
          <h2>Custom Life</h2><p>Choose your name, birthplace, family background, and natural talent.</p>
          <Button icon="custom" disabled={busy} onClick={customize}>Create a Character</Button>
        </section>
      </div>
      <Feedback error={problem} />
    </main>
  );
}

export function CustomLife({ start, cancel }: { start: (profile: ProfileInput) => void; cancel: () => void }) {
  const { ready, busy, problem, clearMessage } = useGame();
  const [profile, setProfile] = useState<ProfileInput>({
    firstName: '', lastName: '', gender: 'nonbinary', country, city: cities[0], background: 'middle-income',
    birthYear: defaultBirthYear, talent: null,
  });
  function set<K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) {
    clearMessage();
    setProfile((current) => ({ ...current, [key]: value }));
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    start(profile);
  }
  return (
    <main className="inner" id="main">
      <Heading title="Custom Life" action={<Button icon="close" kind="quiet" onClick={cancel}>Cancel</Button>} />
      <form onSubmit={submit} className="surface profile-form">
        <div className="field-grid">
          <label>First name<input required maxLength={28} value={profile.firstName} autoComplete="off" onChange={(e) => set('firstName', e.target.value)} /></label>
          <label>Last name<input required maxLength={28} value={profile.lastName} autoComplete="off" onChange={(e) => set('lastName', e.target.value)} /></label>
          <label>Gender<select value={profile.gender} onChange={(e) => set('gender', e.target.value as ProfileInput['gender'])}>
            {genders.map((item) => <option key={item} value={item}>{genderLabels[item]}</option>)}
          </select></label>
          <label>Birth year<input type="number" required min={firstBirthYear} max={lastBirthYear}
            value={Number.isNaN(profile.birthYear) ? '' : profile.birthYear} onChange={(e) => set('birthYear', e.target.valueAsNumber)} /></label>
          <label>Birth city<select value={profile.city} onChange={(e) => set('city', e.target.value as ProfileInput['city'])}>
            {cities.map((item) => <option key={item}>{item}</option>)}
          </select></label>
          <label>Country<input value={country} readOnly /></label>
          <label>Family background<select value={profile.background} onChange={(e) => set('background', e.target.value as ProfileInput['background'])}>
            {backgrounds.map((item) => <option key={item} value={item}>{backgroundLabels[item]}</option>)}
          </select></label>
          <label>Natural talent<select value={profile.talent ?? ''} onChange={(e) => set('talent', (e.target.value as Talent) || null)}>
            <option value="">None</option>{talents.map((item) => <option key={item} value={item}>{talentLabels[item]}</option>)}
          </select></label>
        </div>
        <Feedback error={problem} />
        <Button icon="new" kind="primary" type="submit" disabled={!ready || busy}>Begin Life</Button>
      </form>
    </main>
  );
}

export function SavedLives({ open }: { open: (id: string) => void }) {
  const { saves, busy, problem, notice, remove } = useGame();
  const [deleting, setDeleting] = useState<string | null>(null);
  async function deleteLife(id: string) {
    if (await remove(id)) setDeleting(null);
  }
  return (
    <main className="inner" id="main">
      <Heading title="Saved Lives" detail="Stored in this browser." />
      <Feedback error={problem} notice={notice} />
      <section className="surface saves-list" aria-label="Saved lives">
        {!saves.length && <p>Start a new life and it will appear here.</p>}
        {saves.map((save) => <div className="save-row" key={save.id}>
          <div className="initials">{save.name.split(/\s+/).filter(Boolean).map((part) => Array.from(part)[0]).slice(0, 2).join('')}</div>
          <div className="save-name"><strong>{save.name}</strong><span>{save.completed ? 'Completed' : en.age(save.age)} · {save.city} · {save.year}</span></div>
          <div className="save-controls">
            <Button icon={save.completed ? 'history' : 'continue'} onClick={() => open(save.id)} disabled={busy}>Open</Button>
            <Button icon="delete" kind="quiet" aria-label={`Delete ${save.name}’s life`} onClick={() => setDeleting(save.id)} disabled={busy}>Delete</Button>
          </div>
          {deleting === save.id && <div className="save-confirm">
            <p>Delete {save.name}’s saved life from this browser?</p>
            <Button icon="close" onClick={() => setDeleting(null)} disabled={busy}>Cancel</Button>
            <Button icon="delete" kind="danger" onClick={() => void deleteLife(save.id)} disabled={busy}>Delete permanently</Button>
          </div>}
        </div>)}
      </section>
    </main>
  );
}

export function Achievements() {
  const saves = useGame((state) => state.saves);
  const milestones = [
    { title: 'First Chapter', detail: 'Start a life.', earned: saves.length > 0 },
    { title: 'School’s Out', detail: 'Graduate from high school at age 18.', earned: saves.some((life) => life.age >= 18) },
    { title: 'Half a Century', detail: 'Reach age 50.', earned: saves.some((life) => life.age >= 50) },
    { title: 'A Life Lived', detail: 'Complete a life.', earned: saves.some((life) => life.completed) },
  ];
  return <div className="achievement-list">{milestones.map((item) => <article className="achievement" key={item.title}>
    <Icon name="trophy" /><div><h3>{item.title}</h3><p>{item.detail}</p></div><span>{item.earned ? 'Earned' : 'Locked'}</span>
  </article>)}</div>;
}

export function Settings() {
  const { haptics, toggleHaptics, ready, busy, problem, notice } = useGame();
  const supportsVibration = typeof navigator.vibrate === 'function';
  return <>
    <Rows items={[{ label: 'Language', value: 'English' }, { label: 'Save location', value: 'This browser' }]} />
    {supportsVibration && <Button icon="phone" disabled={busy || !ready} onClick={() => void toggleHaptics()}>
      {haptics ? 'Turn Haptics Off' : 'Turn Haptics On'}
    </Button>}
    <Feedback error={problem} notice={notice} />
  </>;
}
