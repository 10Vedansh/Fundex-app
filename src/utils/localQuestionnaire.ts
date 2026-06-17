const STORAGE_KEY_PREFIX = 'fx_questionnaire_';

export function saveQuestionnaireToLocal(userId: string, data: Record<string, string | null>) {
  try {
    const existing = loadRawFromLocal(userId);
    const merged = { ...existing, ...data };
    localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(merged));
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
  return data;
}

export function clearQuestionnaireFromLocal(userId: string) {
  try {
    localStorage.removeItem(STORAGE_KEY_PREFIX + userId);
  } catch (e) {
    console.error('[PROFILE_RESTORE] localStorage clear error:', e);
  }
}
