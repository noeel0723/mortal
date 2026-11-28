import { useId, useState } from 'react';
import { contactRole } from '../src/contactView';
import { giftIssue, giftOffers } from '../src/engine/gifts';
import type { Contact, Life } from '../src/engine/types';
import { money } from '../src/i18n/en';
import { DetailDialog } from './detailDialog';
import { Portrait } from './portraits';
import { Button } from './ui';

export function GiftPicker({ life, person, round, busy, onCancel, onGive }: {
  life: Life; person: Contact; round: number; busy: boolean; onCancel: () => void; onGive: (gift: string) => void;
}) {
  const selectId = useId();
  const offers = giftOffers(life, person, round);
  const [selected, select] = useState(offers[0]!.gift.id);
  const { gift, price } = offers.find((offer) => offer.gift.id === selected) ?? offers[0]!;
  const issue = giftIssue(life, person, gift);

  return <DetailDialog title="Give a Gift" onDismiss={onCancel} identity={
    <div className="detail-identity gift-identity">
      <Portrait appearance={person.appearance} age={person.age} label={`Portrait of ${person.name}`} />
      <div><strong>{person.name}</strong><p>{contactRole(person, life)}</p></div>
    </div>}>
    <div className="gift-picker field-grid">
      <label htmlFor={selectId}>Choose a gift</label>
      <select id={selectId} value={gift.id} onChange={(event) => select(event.target.value)} disabled={busy}>
        {offers.map(({ gift, price }) => <option key={gift.id} value={gift.id}>{gift.name} · {money(price)}</option>)}
      </select>
      <div className="gift-price"><span>Price</span><strong>{money(price)}</strong></div>
      {issue && <p className="gift-issue">{issue}</p>}
      <div className="gift-actions">
        <Button icon="close" kind="quiet" disabled={busy} onClick={onCancel}>Cancel</Button>
        <Button icon="gift" kind="primary" disabled={busy || !!issue} onClick={() => onGive(gift.id)}>Give Gift</Button>
      </div>
    </div>
  </DetailDialog>;
}
