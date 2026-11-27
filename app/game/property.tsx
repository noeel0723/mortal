import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { ActionButton, DataRow, Heading, Page, Section, shared } from '../../src/components/ui';
import { assetKinds } from '../../src/data/shops';
import type { AssetKind, AssetListing } from '../../src/data/shops';
import { propertyIssue, propertyQuote } from '../../src/engine/property';
import { money } from '../../src/i18n/en';
import { assetArt } from '../../src/portraits/assetArt';
import { housingControls, listingsFor, ownedListings, ownershipDetail, propertyCategories, residenceLabel } from '../../src/propertyView';
import { useGame } from '../../src/stores/game';
import { radius, space } from '../../src/theme/tokens';

function Artwork({ listing, large = false }: { listing: AssetListing; large?: boolean }) {
  return <Image source={{ uri: assetArt(listing) }} style={large ? styles.preview : styles.thumbnail} resizeMode="contain"
    accessible={large} accessibilityLabel={large ? `Pixel artwork of ${listing.name}` : undefined} fadeDuration={0} />;
}

export default function Property() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { slot, busy, dispatch } = useGame();
  const [category, setCategory] = useState<AssetKind>();
  const [selected, setSelected] = useState<AssetListing>();
  if (!slot) return null;
  const { life } = slot;
  const assets = () => router.dismissTo('/game/assets');

  if (mode === 'housing') return <Page inGame>
    <Heading title="Housing" back={assets} />
    <DataRow label="Where you live" value={residenceLabel(life)} />
    <Section title="Moving Out">
      {housingControls(life).map((item) => <ActionButton key={item.label} label={item.label} icon={item.icon}
        detail={item.issue ?? item.detail} disabled={busy || !!item.issue} onPress={() => void dispatch(item.action)} />)}
    </Section>
  </Page>;

  if (mode === 'owned') {
    const owned = ownedListings(life);
    return <Page inGame>
      <Heading title="Owned Assets" back={assets} />
      {owned.length ? assetKinds.map((kind) => {
        const items = owned.filter(({ listing }) => listing.kind === kind);
        return items.length ? <Section key={kind} title={propertyCategories[kind].label}>{items.map((item) =>
          <View key={item.id} style={styles.ownedRow}>
            <Artwork listing={item.listing} />
            <View style={styles.description}><Text style={shared.strong}>{item.listing.name}</Text>
              <Text style={shared.small}>{ownershipDetail(item, life.property.residence)}</Text>
            </View>
          </View>)}</Section> : null;
      }) : <Text style={shared.body}>You do not own any houses or vehicles yet.</Text>}
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
  ownedRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  description: { flex: 1 },
});
