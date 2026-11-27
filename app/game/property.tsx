import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, Text } from 'react-native';
import { ActionButton, DataRow, Heading, Page, Section, shared } from '../../src/components/ui';
import { DetailModal } from '../../src/components/detailModal';
import { assetKinds } from '../../src/data/shops';
import type { AssetKind, AssetListing } from '../../src/data/shops';
import { propertyIssue, propertyQuote } from '../../src/engine/property';
import type { Action } from '../../src/engine/types';
import { money } from '../../src/i18n/en';
import { assetArt } from '../../src/portraits/assetArt';
import { assetDetails, householdRows, housingControls, listingsFor, ownedListings, ownershipDetail, propertyCategories, residenceLabel } from '../../src/propertyView';
import { useGame } from '../../src/stores/game';
import { radius } from '../../src/theme/tokens';

function Artwork({ listing, large = false }: { listing: AssetListing; large?: boolean }) {
  return <Image source={{ uri: assetArt(listing) }} style={large ? styles.preview : styles.thumbnail} resizeMode="contain"
    accessible={large} accessibilityLabel={large ? `Pixel artwork of ${listing.name}` : undefined} fadeDuration={0} />;
}

export default function Property() {
  const { mode, ownership } = useLocalSearchParams<{ mode?: string; ownership?: string }>();
  const { slot, busy, dispatch } = useGame();
  const [category, setCategory] = useState<AssetKind>();
  const [selected, setSelected] = useState<AssetListing>();
  const [confirm, setConfirm] = useState<{ label: string; detail?: string; action: Action } | null>(null);
  if (!slot) return null;
  const { life } = slot;
  const assets = () => router.dismissTo('/game/assets');

  const holding = ownership ? ownedListings(life, true).find(({ ownershipId }) => ownershipId === ownership) : undefined;
  if (holding) {
    const details = assetDetails(life, holding);
    return <Page inGame>
      <Heading title={holding.listing.name} back={() => router.canGoBack() ? router.back() : assets()} />
      <Artwork listing={holding.listing} large />
      <Section title="Asset Details">{details.displayRows.map((row) => <DataRow key={row.label} {...row} />)}</Section>
      {details.household.length > 0 && <Section title="Household">
        {details.household.map(({ key, ...row }) => <DataRow key={key} {...row} />)}
      </Section>}
      {details.driving.length > 0 && <Section title="Family Drivers">
        {details.driving.map((item) => <ActionButton key={item.action.person} icon={item.icon} label={item.label} detail={item.issue ?? item.detail}
          disabled={busy || !!item.issue} onPress={() => item.action.mode === 'teach' ? void dispatch(item.action) : setConfirm(item)} />)}
      </Section>}
      {details.rentalRows.length > 0 && <Section title="Rental">{details.rentalRows.map((row) => <DataRow key={row.label} {...row} />)}</Section>}
      {details.controls.length > 0 && <Section title="Manage">
        {details.controls.map((item) => <ActionButton key={item.label} icon={item.icon} label={item.label} detail={item.issue ?? item.detail}
          disabled={busy || !!item.issue} onPress={() => setConfirm(item)} />)}
      </Section>}
      {details.history.length > 0 && <Section title="Ownership History">
        {details.history.map(({ key, ...row }) => <DataRow key={key} {...row} />)}
      </Section>}
      {confirm && <DetailModal title={confirm.label} open onDismiss={() => setConfirm(null)}>
        <Text style={shared.body}>{holding.listing.name}{confirm.detail ? ` · ${confirm.detail}` : ''}</Text>
        <ActionButton icon="accept" label="Confirm" disabled={busy} onPress={() => {
          setConfirm(null);
          void dispatch(confirm.action);
        }} />
      </DetailModal>}
    </Page>;
  }

  const household = householdRows(life);
  if (mode === 'housing') return <Page inGame>
    <Heading title="Housing" back={assets} />
    <DataRow label="Where you live" value={residenceLabel(life)} />
    {household.length > 0 && <Section title="Household">
      {household.map(({ key, ...row }) => <DataRow key={key} {...row} />)}
    </Section>}
    <Section title="Moving Out">
      {housingControls(life).map((item) => <ActionButton key={item.label} label={item.label} icon={item.icon}
        detail={item.issue ?? item.detail} disabled={busy || !!item.issue} onPress={() => void dispatch(item.action)} />)}
    </Section>
  </Page>;

  if (mode === 'owned' || mode === 'properties' || mode === 'vehicles' || mode === 'history') {
    const owned = ownedListings(life, mode === 'history').filter(({ listing }) =>
      mode === 'properties' ? listing.kind === 'houses' : mode === 'vehicles' ? listing.kind !== 'houses' : true);
    const title = mode === 'properties' ? 'Properties' : mode === 'vehicles' ? 'Vehicles' : mode === 'history' ? 'Ownership History' : 'Owned Assets';
    return <Page inGame>
      <Heading title={title} back={() => mode === 'history' && router.canGoBack() ? router.back() : assets()} />
      {owned.length ? assetKinds.map((kind) => {
        const items = owned.filter(({ listing }) => listing.kind === kind);
        return items.length ? <Section key={kind} title={propertyCategories[kind].label}>{items.map((item) =>
          <ActionButton key={item.ownershipId} icon={propertyCategories[kind].icon} label={item.listing.name}
            leading={<Artwork listing={item.listing} />} detail={ownershipDetail(item, life.property.residence)}
            onPress={() => router.push({ pathname: '/game/property', params: { mode, ownership: item.ownershipId } })} />)}</Section> : null;
      }) : <Text style={shared.body}>You do not own any houses or vehicles yet.</Text>}
      {mode !== 'history' && <ActionButton icon="history" label="View Ownership History"
        onPress={() => router.push({ pathname: '/game/property', params: { mode: 'history' } })} />}
    </Page>;
  }

  if (selected) {
    const action = { type: 'buy-asset', id: selected.id } as const;
    const issue = propertyIssue(life, action);
    return <Page key={selected.id} inGame>
      <Heading title={selected.name} back={() => setSelected(undefined)} />
      <Artwork listing={selected} large />
      <Text style={shared.body}>{selected.detail}</Text>
      <ActionButton icon="cart" label={`Buy · ${money(propertyQuote(life, selected).price)}`} detail={issue ?? 'Pay from your current balance.'}
        disabled={busy || !!issue} onPress={() => void dispatch(action)} />
    </Page>;
  }

  if (category) return <Page key={category} inGame>
    <Heading title={propertyCategories[category].label} back={() => setCategory(undefined)} />
    <Section title={`${listingsFor(category).length} listings`}>
      {listingsFor(category).map((listing) => <ActionButton key={listing.id} icon={propertyCategories[category].icon}
        label={listing.name} detail={money(propertyQuote(life, listing).price)} leading={<Artwork listing={listing} />} onPress={() => setSelected(listing)} />)}
    </Section>
  </Page>;

  return <Page inGame>
    <Heading title="Shopping" back={assets} />
    <Section title="Browse">
      {assetKinds.map((kind) => <ActionButton key={kind} icon={propertyCategories[kind].icon} label={propertyCategories[kind].label}
        detail={`${listingsFor(kind).length} listings`} onPress={() => setCategory(kind)} />)}
    </Section>
  </Page>;
}

const styles = StyleSheet.create({
  preview: { width: '100%', maxWidth: 252, aspectRatio: 1, alignSelf: 'center', borderRadius: radius.lg },
  thumbnail: { width: 52, height: 52, borderRadius: radius.sm },
});
