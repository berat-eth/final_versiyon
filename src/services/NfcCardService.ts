import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { Alert, Platform } from 'react-native';

export interface NfcCardData {
  raw: string;
  pan?: string;
  expiryMonth?: string;
  expiryYear?: string;
  cardHolderName?: string;
}

// Basit NFC başlatma ve kart okuma servisi (EMV TLV parse basitleştirilmiş)
export class NfcCardService {
  static async init(): Promise<boolean> {
    try {
      // Destek ve native modül kontrolleri
      const supported = await NfcManager.isSupported?.();
      if (!supported) {
        console.log('ℹ️ NFC desteklenmiyor (cihaz/OS)');
        return false;
      }
      if (typeof (NfcManager as any)?.start !== 'function') {
        console.log('ℹ️ NFC native modülü mevcut değil, başlatma atlandı');
        return false;
      }

      console.log('🔧 NFC Manager başlatılıyor...');
      await NfcManager.start();
      console.log('✅ NFC Manager başlatıldı');
      return true;
    } catch (e) {
      console.error('❌ NFC Manager başlatılamadı:', e);
      return false;
    }
  }

  static async isSupported(): Promise<boolean> {
    try {
      console.log('🔍 NFC desteği kontrol ediliyor...');
      const supported = await NfcManager.isSupported();
      console.log('📱 NFC desteği:', supported);
      
      if (supported) {
        const enabled = await NfcManager.isEnabled();
        console.log('🔓 NFC etkin mi:', enabled);
        return enabled;
      }
      
      return false;
    } catch (error) {
      console.error('❌ NFC desteği kontrol edilemedi:', error);
      return false;
    }
  }

  static async checkAvailability(): Promise<{ supported: boolean; enabled: boolean }> {
    try {
      const supported = await NfcManager.isSupported();
      const enabled = supported ? await NfcManager.isEnabled() : false;
      return { supported, enabled };
    } catch (error) {
      console.error('❌ NFC kullanılabilirlik kontrol hatası:', error);
      return { supported: false, enabled: false };
    }
  }

  static async ensureEnabledWithPrompt(): Promise<{ supported: boolean; enabled: boolean }>{
    const { supported, enabled } = await this.checkAvailability();
    if (!supported) {
      return { supported, enabled };
    }

    if (!enabled) {
      Alert.alert(
        'NFC Kapalı',
        'Bu özelliği kullanmak için NFC açılmalıdır. Ayarlara gitmek ister misiniz?',
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Aç',
            onPress: async () => {
              try {
                // Android için ayarlara yönlendirme
                if (Platform.OS === 'android') {
                  await NfcManager.goToNfcSetting?.();
                }
              } catch (e) {
                console.error('❌ NFC ayarlarına yönlendirme hatası:', e);
              }
            },
          },
        ],
        { cancelable: true }
      );
    }

    return { supported, enabled };
  }

  static async readOnce(timeoutMs: number = 15000): Promise<NfcCardData | null> {
    try {
      if (__DEV__) console.log('📱 NFC kart okuma başlatılıyor...');
      
      // Önce NDEF teknolojisini dene
      try {
        await NfcManager.requestTechnology(NfcTech.Ndef, { 
          alertMessage: 'Kartı telefonun arkasına yaklaştırın',
          invalidateAfterFirstRead: false
        });
        const tag = await NfcManager.getTag();
        const raw = JSON.stringify({ tag });
        if (__DEV__) console.log('✅ NDEF kart okundu');
        return { raw };
      } catch (ndefError) {
        if (__DEV__) console.log('⚠️ NDEF okuma başarısız, IsoDep deneniyor...');
        
        // NDEF başarısız olursa IsoDep teknolojisini dene (EMV kartlar için)
        try {
          await NfcManager.requestTechnology(NfcTech.IsoDep, {
            alertMessage: 'Kartı telefonun arkasına yaklaştırın',
            invalidateAfterFirstRead: false
          });
          const tag = await NfcManager.getTag();
          const raw = JSON.stringify({ tag, technology: 'IsoDep' });
          if (__DEV__) console.log('✅ IsoDep kart okundu');
          return { raw };
        } catch (isoDepError) {
          if (__DEV__) console.log('⚠️ IsoDep okuma da başarısız, genel tag okuma deneniyor...');
          
          // Son çare olarak genel tag okuma
          await NfcManager.requestTechnology([NfcTech.Ndef, NfcTech.IsoDep, NfcTech.NfcA], {
            alertMessage: 'Kartı telefonun arkasına yaklaştırın',
            invalidateAfterFirstRead: false
          });
          const tag = await NfcManager.getTag();
          const raw = JSON.stringify({ tag, technology: 'General' });
          if (__DEV__) console.log('✅ Genel kart okuma başarılı');
          return { raw };
        }
      }
    } catch (e) {
      if (__DEV__) console.error('❌ NFC kart okuma hatası:', e);
      return null;
    } finally {
      NfcManager.cancelTechnologyRequest().catch(() => {});
    }
  }

  static async readEmvOnce(): Promise<NfcCardData | null> {
    try {
      await NfcManager.requestTechnology(NfcTech.IsoDep, {
        alertMessage: 'Kartı telefonun arkasına yaklaştırın',
        invalidateAfterFirstRead: false
      });

      const tag = await NfcManager.getTag();

      const isoAny: any = (NfcManager as any).isoDepHandler || (NfcManager as any);
      const tx = async (hex: string): Promise<Uint8Array> => {
        const bytes = hexStringToBytes(hex);
        if (typeof isoAny.transceive === 'function') {
          const resp = await isoAny.transceive(bytes);
          return toUint8(resp);
        }
        if (typeof isoAny.sendCommandAPDUBytes === 'function') {
          const resp = await isoAny.sendCommandAPDUBytes(bytes);
          return toUint8(resp);
        }
        throw new Error('IsoDep transceive API not available');
      };

      const selectResp = await tx('00A404000E325041592E5359532E4444463031');
      const aids = extractAidsFromFci(selectResp);
      const candidateAids = aids.length ? aids : [
        'A0000000031010',
        'A0000000041010',
        'A00000002501',
        'A0000000032010'
      ];

      for (const aid of candidateAids) {
        try {
          await tx('00A40400' + toLen(aid) + aid);
          // GPO - minimal PDOL (83 00)
          const gpo = await tx('80A8000002830000');
          // READ RECORDS brute-force
          const tlvs: Uint8Array[] = [];
          for (let sfi = 1; sfi <= 31; sfi++) {
            for (let rec = 1; rec <= 10; rec++) {
              try {
                const p2 = ((sfi << 3) | 4).toString(16).padStart(2, '0');
                const resp = await tx(`00B2${rec.toString(16).padStart(2, '0')}${p2}00`);
                tlvs.push(resp);
              } catch {}
            }
          }
          const all = concatBytes([gpo, ...tlvs]);
          const parsed = parseTlv(all);
          const track2 = findTlv(parsed, 0x57);
          const panTlv = findTlv(parsed, 0x5A);
          const expTlv = findTlv(parsed, 0x5F24);

          let pan: string | undefined;
          let expiryYear: string | undefined;
          let expiryMonth: string | undefined;

          if (track2) {
            const t2 = bytesToHex(track2.value).toUpperCase();
            const cleaned = t2.replace(/F+$/g, '');
            const [panHex, rest] = cleaned.split('D');
            if (panHex && rest && rest.length >= 4) {
              pan = hexBcdToDigits(panHex);
              expiryYear = '20' + rest.substring(0, 2);
              expiryMonth = rest.substring(2, 4);
            }
          }
          if (!pan && panTlv) {
            pan = hexBcdToDigits(bytesToHex(panTlv.value));
          }
          if ((!expiryYear || !expiryMonth) && expTlv) {
            const hex = bytesToHex(expTlv.value);
            expiryYear = '20' + hex.substring(0, 2);
            expiryMonth = hex.substring(2, 4);
          }

          if (pan) {
            return {
              raw: JSON.stringify({ tag, aid }),
              pan,
              expiryMonth,
              expiryYear,
            };
          }
        } catch {}
      }

      return { raw: JSON.stringify({ tag, note: 'No EMV data' }) };
    } catch (e) {
      if (__DEV__) console.error('❌ NFC EMV okuma hatası:', e);
      return null;
    } finally {
      NfcManager.cancelTechnologyRequest().catch(() => {});
    }
  }
}

export default NfcCardService;


function toUint8(value: number[] | Uint8Array): Uint8Array {
  return value instanceof Uint8Array ? value : Uint8Array.from(value);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexStringToBytes(hex: string): number[] {
  const clean = hex.replace(/\s+/g, '');
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    out.push(parseInt(clean.substr(i, 2), 16));
  }
  return out;
}

function toLen(hex: string): string {
  return (hex.length / 2).toString(16).padStart(2, '0');
}

function concatBytes(arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((acc, a) => acc + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  arrays.forEach(a => { out.set(a, offset); offset += a.length; });
  return out;
}

type TlvNode = { tag: number; length: number; value: Uint8Array; children?: TlvNode[] };

function parseTlv(data: Uint8Array): TlvNode[] {
  const nodes: TlvNode[] = [];
  let i = 0;
  while (i < data.length) {
    // Parse Tag (support multi-byte tag like 0x5F24, 0x9F36)
    let tag = data[i++];
    if (i > data.length) break;
    if ((tag & 0x1f) === 0x1f) {
      // subsequent tag bytes while bit7 == 1
      let tagBytes: number[] = [tag];
      let t = 0;
      do {
        if (i >= data.length) break;
        t = data[i++];
        tagBytes.push(t);
      } while ((t & 0x80) === 0x80);
      // convert tag bytes to number
      tag = tagBytes.reduce((acc, b) => (acc << 8) | b, 0);
    }

    if (i >= data.length) break;
    // Parse Length (support long-form)
    let lenByte = data[i++];
    let len = 0;
    if ((lenByte & 0x80) === 0x80) {
      const numLenBytes = lenByte & 0x7f;
      for (let j = 0; j < numLenBytes; j++) {
        if (i >= data.length) break;
        len = (len << 8) | data[i++];
      }
    } else {
      len = lenByte;
    }

    if (len < 0 || i + len > data.length) {
      break; // stop on malformed
    }
    const value = data.slice(i, i + len);
    i += len;

    const isConstructed = (typeof tag === 'number' ? ((tag >> (8 * (Math.ceil(Math.log2(tag + 1) / 8) - 1))) & 0x20) : 0) === 0x20;
    const node: TlvNode = { tag, length: len, value };
    if (isConstructed && value.length) {
      node.children = parseTlv(value);
    }
    nodes.push(node);
  }
  return nodes;
}

function findTlv(nodes: TlvNode[], tag: number): TlvNode | undefined {
  for (const n of nodes) {
    if (n.tag === tag) return n;
    if (n.children) {
      const found = findTlv(n.children, tag);
      if (found) return found;
    }
  }
  return undefined;
}

function extractAidsFromFci(resp: Uint8Array): string[] {
  const nodes = parseTlv(resp);
  const aids: string[] = [];
  const scan = (list: TlvNode[]) => {
    for (const n of list) {
      if (n.tag === 0x4f) {
        aids.push(bytesToHex(n.value).toUpperCase());
      }
      if (n.children) scan(n.children);
    }
  };
  scan(nodes);
  return Array.from(new Set(aids));
}

function hexBcdToDigits(hex: string): string {
  return hex.replace(/\s+/g, '').replace(/F+$/i, '').replace(/(..)/g, (_m, p1) => {
    const v = parseInt(p1, 16);
    const hi = ((v >> 4) & 0x0f).toString();
    const lo = (v & 0x0f).toString();
    return hi + lo;
  }).replace(/^0+/, '');
}
