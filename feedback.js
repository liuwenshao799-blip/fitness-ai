import { loadHistory, saveHistory } from "./storage.js";

export function addTrainingFeedback(userId, dayPlan, formData) {
  const history = loadHistory(userId);
  const entry = {
    id: `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    date: todayKey(),
    createdAt: new Date().toISOString(),
    day: dayPlan.day,
    focus: dayPlan.focus,
    weight: Number(formData.weight),
    completion: Number(formData.completion),
    fatigue: Number(formData.fatigue),
    difficulty: formData.difficulty,
    actualCompletion: formData.actualCompletion || "全部完成",
    exerciseDifficulty: formData.exerciseDifficulty || "适中",
    executionEase: formData.executionEase || "简单",
    sleep: Number(formData.sleep),
    note: formData.note || ""
  };
  const nextHistory = [entry, ...history.filter((item) => item.date !== entry.date)].slice(0, 180);
  saveHistory(userId, nextHistory);
  return nextHistory;
}

export function getRecentHistory(userId, count = 7) {
  return loadHistory(userId).slice(0, count);
}

export function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function currentWeekKeys() {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return todayKey(date);
  });
}

export function calculateStreak(done) {
  let streak = 0;
  const cursor = new Date();
  for (let index = 0; index < 365; index += 1) {
    if (!done[todayKey(cursor)]) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
