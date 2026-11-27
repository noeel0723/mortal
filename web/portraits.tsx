import { useState } from 'react';
import { appearanceChanged, appearanceIssue, appearanceOptions, canEditFace, faceFields, hairFields } from '../src/engine/appearance';
import type { Appearance } from '../src/engine/appearance';
import type { Life } from '../src/engine/types';
import { portraitSrc } from '../src/portraits/portrait';
import { useGame } from './browserStore';
import { Button } from './ui';

export function Portrait({ appearance, age, label = '', large = false }: {
  appearance: Appearance; age: number; label?: string; large?: boolean;
}) {
  return <img className={`portrait${large ? ' portrait--large' : ''}`} src={portraitSrc(appearance, age)} alt={label} width="72" height="72" />;
}

export function PortraitEditor({ appearance, age, hairOnly, onChange }: {
  appearance: Appearance; age: number; hairOnly: boolean; onChange: (appearance: Appearance) => void;
}) {
  const fields = hairOnly ? hairFields : [...hairFields, ...faceFields];
  const birthPreview = !hairOnly && age === 0;
  return <div className="portrait-editor">
    <div className="portrait-previews">
      <figure><Portrait appearance={appearance} age={age} label="Portrait preview" large />
        {birthPreview && <figcaption>At birth</figcaption>}</figure>
      {birthPreview && <figure><Portrait appearance={appearance} age={24} label="Adult portrait preview" large /><figcaption>As an adult</figcaption></figure>}
    </div>
    <div className="field-grid">
      {fields.map((key) => {
        const { label, values } = appearanceOptions[key];
        return <label key={key}>{label}<select value={appearance[key]} onChange={(event) => onChange({ ...appearance, [key]: event.target.value })}>
          {values.map((item) => <option key={item} value={item}>{item}</option>)}
        </select></label>;
      })}
    </div>
  </div>;
}

export function AppearancePage({ life, back }: { life: Life; back: () => void }) {
  const { busy, dispatch } = useGame();
  const { appearance, age } = life.character;
  const [draft, setDraft] = useState(appearance);
  const hairOnly = !canEditFace(age);
  const issue = appearanceIssue(life, hairOnly);

  async function save() {
    const action = hairOnly ? { type: 'change-hair' as const, choices: { hair: draft.hair, hairColor: draft.hairColor } } :
      { type: 'change-appearance' as const, choices: draft };
    if (await dispatch(action)) back();
  }

  return <div className="appearance-panel">
    <PortraitEditor appearance={draft} age={age} hairOnly={hairOnly} onChange={setDraft} />
    {issue && <p className="play-empty">{issue}</p>}
    <Button icon="save" kind="primary" disabled={busy || !!issue || !appearanceChanged(appearance, draft, hairOnly)} onClick={() => void save()}>
      {hairOnly ? 'Save Hairstyle' : 'Save Appearance'}
    </Button>
  </div>;
}
