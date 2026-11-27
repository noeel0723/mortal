import { getDocumentAsync } from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { maxPortableBytes, portableSizeError } from './portableSave';

export async function pickSaveFile() {
  const result = await getDocumentAsync({ type: '*/*', multiple: false, copyToCacheDirectory: true });
  if (result.canceled) return null;
  const selected = result.assets[0];
  if (!selected) return null;
  const file = new File(selected.uri);
  if ((selected.size ?? file.size) > maxPortableBytes) throw new Error(portableSizeError);
  return file.text();
}

export async function shareSaveFile(text: string, filename: string) {
  if (!await isAvailableAsync()) throw new Error('File sharing is unavailable on this device.');
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(text);
  await shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Export Mortal Save' });
}
