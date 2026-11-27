import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { PortraitEditor } from '../../src/components/portrait';
import { ActionButton, Heading, Page, shared } from '../../src/components/ui';
import { appearanceChanged, appearanceIssue, canEditFace } from '../../src/engine/appearance';
import type { Life } from '../../src/engine/types';
import { useGame } from '../../src/stores/game';

function Editor({ life }: { life: Life }) {
  const { busy, dispatch } = useGame();
  const { appearance, age } = life.character;
  const [draft, setDraft] = useState(appearance);
  const hairOnly = !canEditFace(age);
  const issue = appearanceIssue(life, hairOnly);
  const back = () => router.dismissTo('/game/activities');

  async function save() {
    const action = hairOnly ? { type: 'change-hair' as const, choices: { hair: draft.hair, hairColor: draft.hairColor } } :
      { type: 'change-appearance' as const, choices: draft };
    if (await dispatch(action)) back();
  }

  return <Page inGame>
    <Heading title="Appearance" back={back} />
    <PortraitEditor appearance={draft} age={age} hairOnly={hairOnly} onChange={setDraft} />
    {issue && <Text style={shared.small}>{issue}</Text>}
    <ActionButton icon="save" variant="primary" label={hairOnly ? 'Save Hairstyle' : 'Save Appearance'}
      disabled={busy || !!issue || !appearanceChanged(appearance, draft, hairOnly)} onPress={() => void save()} />
  </Page>;
}

export default function Appearance() {
  const slot = useGame((state) => state.slot);
  return slot ? <Editor life={slot.life} key={slot.id} /> : null;
}
