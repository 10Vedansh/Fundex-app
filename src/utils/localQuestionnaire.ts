const STORAGE_KEY_PREFIX = 'fx_questionnaire_';

export function saveQuestionnaireToLocal(userId: string, data: Record<string, string | null>) {
  try {
    const existing = loadRawFromLocal(userId);
    const merged = { ...existing, ...data };
    localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(merged));
    console.log('[PROFILE_SAVE] questionnaire saved to localStorage:', Object.keys(data));
  } catch (e) {
    console.error('[PROFILE_SAVE] localStorage error:', e);
  }
}

function loadRawFromLocal(userId: string): Record<string, string | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + userId);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('[PROFILE_LOAD] localStorage parse error:', e);
  }
  return {};
}

export function loadQuestionnaireFromLocal(userId: string): Record<string, string | null> {
  const data = loadRawFromLocal(userId);
  if (Object.keys(data).length > 0) {
    console.log('[PROFILE_LOAD] loaded', Object.keys(data).length, 'fields from localStorage');
  }
  return data;
}

export function clearQuestionnaireFromLocal(userId: string) {
  try {
    localStorage.removeItem(STORAGE_KEY_PREFIX + userId);
    console.log('[PROFILE_RESTORE] cleared localStorage for user', userId);
  } catch (e) {
    console.error('[PROFILE_RESTORE] localStorage clear error:', e);
  }
}
