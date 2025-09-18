import AsyncStorage from '@react-native-async-storage/async-storage';

const DAILY_LIMIT = 3;

function getTodayKey(userId: number | string): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `social_share_count:${userId}:${yyyy}-${mm}-${dd}`;
}

export async function getTodayShareCount(userId: number | string): Promise<number> {
  try {
    const key = getTodayKey(userId);
    const raw = await AsyncStorage.getItem(key);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export async function canEarnShareExp(userId: number | string): Promise<{ allowed: boolean; remaining: number }> {
  const count = await getTodayShareCount(userId);
  const remaining = Math.max(0, DAILY_LIMIT - count);
  return { allowed: count < DAILY_LIMIT, remaining };
}

export async function recordSuccessfulShare(userId: number | string): Promise<void> {
  try {
    const key = getTodayKey(userId);
    const count = await getTodayShareCount(userId);
    await AsyncStorage.setItem(key, String(count + 1));
  } catch {}
}

export { DAILY_LIMIT };


