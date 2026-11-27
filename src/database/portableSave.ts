import type { Life } from '../engine/types.ts';
import { decodeLife } from './codec.ts';

const format = 'mortal-life';
export const maxPortableBytes = 4 * 1024 * 1024;
export const portableSizeError = 'Choose a Mortal save file no larger than 4 MiB.';

function checkSize(text: string) {
  if (text.length > maxPortableBytes) throw new Error(portableSizeError);
  let bytes = 0;
  for (const character of text) {
    const point = character.codePointAt(0)!;
    bytes += point < 128 ? 1 : point < 2048 ? 2 : point < 65536 ? 3 : 4;
    if (bytes > maxPortableBytes) throw new Error(portableSizeError);
  }
}

function checkStructure(value: unknown, depth = 0) {
  if (value === null || typeof value !== 'object') return;
  if (depth > 24) throw new Error('This Mortal save file has too many nested fields.');
  for (const [key, child] of Object.entries(value)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') throw new Error('This Mortal save file has an invalid field.');
    checkStructure(child, depth + 1);
  }
}

function checkLedger(life: Life) {
  let balance = 0;
  for (const entry of life.transactions) {
    balance += entry.amount;
    if (!Number.isSafeInteger(balance) || balance < 0) throw new Error('The saved cash ledger is inconsistent.');
  }
  if (balance !== life.character.bank) throw new Error('The saved cash ledger does not match its balance.');
}

export function exportPortableLife(life: Life) {
  checkLedger(life);
  const text = JSON.stringify({ format, version: 1, life });
  checkSize(text);
  return text;
}

export function importPortableLife(text: string) {
  checkSize(text);
  let envelope: unknown;
  try {
    envelope = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    throw new Error('This file is not valid Mortal save JSON.');
  }
  if (!envelope || typeof envelope !== 'object' || !('format' in envelope) || envelope.format !== format || !('life' in envelope)) {
    throw new Error('Choose a save exported from Mortal.');
  }
  if (!('version' in envelope) || envelope.version !== 1) throw new Error('This Mortal file uses an unsupported export version.');
  checkStructure(envelope.life);
  const normalized = decodeLife(JSON.stringify(envelope.life));
  const life = decodeLife(JSON.stringify(normalized));
  checkLedger(life);
  return life;
}
