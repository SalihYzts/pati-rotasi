// Fotoğraf çekme/seçme ve kalıcı saklama.
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export async function pickPhoto(source: 'camera' | 'library'): Promise<string | null> {
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [3, 4], quality: 0.85 };
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted && Platform.OS !== 'web') throw new Error('Kamera izni verilmedi.');
    const res = await ImagePicker.launchCameraAsync(opts);
    return res.canceled ? null : (res.assets?.[0]?.uri ?? null);
  }
  const res = await ImagePicker.launchImageLibraryAsync(opts);
  return res.canceled ? null : (res.assets?.[0]?.uri ?? null);
}

/** Fotoğrafı 900 px genişliğe küçültüp JPEG olarak kalıcı yere yazar, yeni URI'yi döner. */
export async function persistPhoto(uri: string, id: string): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri);
  ctx.resize({ width: 900 });
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.72, base64: Platform.OS === 'web' });

  if (Platform.OS === 'web') {
    // Web'de dosya sistemi yok; küçük bir data URI olarak saklıyoruz.
    return out.base64 ? `data:image/jpeg;base64,${out.base64}` : out.uri;
  }
  const dir = new Directory(Paths.document, 'cats');
  dir.create({ intermediates: true, idempotent: true });
  const dest = new File(dir, `${id}.jpg`);
  if (dest.exists) dest.delete();
  await new File(out.uri).copy(dest);
  return dest.uri;
}

export function deletePhoto(uri: string) {
  if (Platform.OS === 'web' || !uri.startsWith('file:')) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {}
}
