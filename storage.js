const USER_PREFIX = "fitness_user_";
const HISTORY_PREFIX = "fitness_training_history_";
const CURRENT_USER_KEY = "fitness_current_user";

export function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

export function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function userKey(userId) {
  return `${USER_PREFIX}${userId}`;
}

export function historyKey(userId) {
  return `${HISTORY_PREFIX}${userId}`;
}

export function getCurrentUserId() {
  return localStorage.getItem(CURRENT_USER_KEY);
}

export function setCurrentUserId(userId) {
  localStorage.setItem(CURRENT_USER_KEY, userId);
}

export function listUserIds() {
  return Object.keys(localStorage)
    .filter((key) => key.startsWith(USER_PREFIX))
    .map((key) => key.replace(USER_PREFIX, ""));
}

export function loadUser(userId) {
  return readJson(userKey(userId), null);
}

export function saveUser(user) {
  writeJson(userKey(user.id), user);
}

export function removeUser(userId) {
  localStorage.removeItem(userKey(userId));
  localStorage.removeItem(historyKey(userId));
}

export function loadHistory(userId) {
  return readJson(historyKey(userId), []);
}

export function saveHistory(userId, history) {
  writeJson(historyKey(userId), history);
}

export function importCloudSnapshot(snapshot) {
  snapshot.users.forEach((row) => {
    const existing = loadUser(row.id) || {};
    saveUser({
      ...existing,
      id: row.id,
      name: row.name,
      gender: row.gender || "未设置",
      age: row.age || 28,
      height: row.height || 170,
      weight: row.weight || 65,
      goal: row.goal || "fatLoss",
      experience: row.experience || "intermediate",
      environment: row.environment || "gym",
      location: row.environment || "gym",
      equipment: row.equipment || [],
      diet_preference: row.diet_preference || "balanced",
      diet_restrictions: row.diet_restrictions || "",
      activity_level: row.activity_level || "moderate",
      trainingDays: existing.trainingDays || 4,
      done: existing.done || {},
      planModifier: existing.planModifier || { volume: 0, cardio: 0, intensity: 0, substitutions: {}, reason: "暂无调整" }
    });
  });

  snapshot.plans.forEach((row) => {
    const user = loadUser(row.user_id);
    if (!user) return;
    user.plan = row.plan_json;
    saveUser(user);
  });

  const groupedHistory = snapshot.history.reduce((acc, row) => {
    acc[row.user_id] ||= [];
    acc[row.user_id].push({
      id: row.feedback?.id || `${row.user_id}_${row.date}`,
      date: row.date,
      createdAt: row.date,
      day: row.feedback?.day || "",
      focus: row.feedback?.focus || "",
      weight: row.weight,
      completion: row.completion_rate,
      fatigue: row.fatigue_level,
      actualCompletion: row.feedback?.actual_completion || "全部完成",
      exerciseDifficulty: row.feedback?.exercise_difficulty || "适中",
      executionEase: row.feedback?.execution_ease || "简单",
      difficulty: row.feedback?.difficulty || "适中",
      sleep: row.feedback?.sleep || 7,
      note: row.feedback?.note || ""
    });
    return acc;
  }, {});

  Object.entries(groupedHistory).forEach(([userId, history]) => {
    saveHistory(userId, history);
  });
}
