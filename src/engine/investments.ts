import { recordNotice } from './eventNotices.ts';
import { postTransaction } from './journal.ts';
import { indexedCents } from './pricing.ts';
import { national } from './world.ts';
import type { Life } from './types.ts';
import { instruments } from './wealthTypes.ts';
import type { InstrumentId, WealthAction } from './wealthTypes.ts';
import type { Industry } from './careerTypes.ts';

export const instrumentNames: Record<InstrumentId, string> = {
  'veyra-index': 'Veyra Market Index Fund', 'technology-fund': 'Technology Fund',
  'healthcare-fund': 'Healthcare Fund', 'government-bonds': 'Veyra Government Bond Fund',
};
const sectors: Partial<Record<InstrumentId, Industry>> = { 'technology-fund': 'Technology', 'healthcare-fund': 'Healthcare' };
export const maximumTrade = 100;
export const investmentPositionLimit = 10000;

export function investmentPrice(life: Life, instrument: InstrumentId) {
  const figure = national(life.world);
  if (instrument === 'government-bonds') return Math.max(550, Math.round(1000 + (figure.priceIndex - 10000) * .026 - (figure.interest - 320) * .38));
  const industry = sectors[instrument];
  const local = industry ? life.world.industries[industry] : undefined;
  const base = 400 + figure.output * .049 + (figure.priceIndex - 10000) * .033;
  const multiplier = local ? 1 + (local.confidence - 55) * .008 + local.growth * .00024 : 1 + (figure.labor - 55) * .004;
  return Math.max(175, Math.min(6500, Math.round(base * multiplier)));
}

export function investmentIssue(life: Life, action: Extract<WealthAction, { type: 'trade-fund' }>) {
  if (!instruments.includes(action.instrument) || !Number.isInteger(action.units) || action.units < 1 || action.units > maximumTrade ||
    (action.side !== 'buy' && action.side !== 'sell')) return 'Choose a fund and between 1 and 100 units.';
  const holding = life.wealth.portfolio[action.instrument];
  const units = holding?.units ?? 0;
  if (action.side === 'sell') return units < action.units ? 'You do not own enough units.' : null;
  if (units + action.units > investmentPositionLimit) return 'This holding has reached its limit.';
  return investmentPrice(life, action.instrument) * action.units > life.character.bank ? 'Your balance does not cover this purchase.' : null;
}

export function tradeInvestment(life: Life, action: Extract<WealthAction, { type: 'trade-fund' }>) {
  const issue = investmentIssue(life, action);
  if (issue) return issue;
  const { side, units, instrument } = action;
  const gross = investmentPrice(life, instrument) * units;
  const holding = life.wealth.portfolio[instrument] ?? { units: 0, basis: 0, realized: 0 };
  const name = instrumentNames[instrument];
  if (side === 'buy') {
    life.wealth.portfolio[instrument] = { ...holding, units: holding.units + units, basis: holding.basis + gross };
    postTransaction(life, `Bought ${units} units of ${name}`, -gross, 'investment-trade', { kind: 'fund', ref: instrument, units, basis: gross });
  } else {
    const proceeds = saleInvestmentQuote(gross);
    const basis = Math.round(holding.basis * units / holding.units);
    life.wealth.portfolio[instrument] = { units: holding.units - units, basis: holding.basis - basis, realized: holding.realized + proceeds - basis };
    postTransaction(life, `Sold ${units} units of ${name}`, proceeds, 'investment-trade', { kind: 'fund', ref: instrument, units: -units, basis: -basis });
  }
  recordNotice(life, 'finance', side === 'buy' ? 'Investment Purchased' : 'Investment Sold',
    `I ${side === 'buy' ? 'bought' : 'sold'} ${units} ${units === 1 ? 'unit' : 'units'} of the ${name}.`);
  return null;
}

export const saleInvestmentQuote = (gross: number) => Math.max(0, gross - Math.max(1, Math.ceil(gross / 100)));

export function settleBondIncome(life: Life) {
  const units = life.wealth.portfolio['government-bonds']?.units ?? 0;
  if (!units) return;
  const rate = Math.min(360, Math.max(75, national(life.world).interest - 80));
  postTransaction(life, 'Veyra government bond distribution', indexedCents(units * investmentPrice(life, 'government-bonds'), rate), 'investment-income');
}
