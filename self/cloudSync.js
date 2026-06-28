let client = null;
let ready = false;
let lastError = "";

export async function initializeCloudSync() {
  const config = window.FITPLAN_SUPABASE || {};
  if (!config.url || !config.anonKey) {
    ready = false;
    return { enabled: false, message: "本地模式" };
  }

  try {
    const mod = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    client = mod.createClient(config.url, config.anonKey);
    ready = true;
    return { enabled: true, message: "云端同步" };
  } catch (error) {
    ready = false;
    lastError = error.message || "Supabase 连接失败";
    return { enabled: false, message: "云端连接失败" };
  }
}

export function isCloudReady() {
  return ready && Boolean(client);
}

export function getCloudStatus() {
  if (isCloudReady()) return "云端同步";
  return lastError ? "云端连接失败" : "本地模式";
}

export async function pullCloudSnapshot() {
  if (!isCloudReady()) return { users: [], plans: [], history: [] };
  const [users, plans, history] = await Promise.all([
    client.from("users").select("*"),
    client.from("workout_plans").select("*").order("created_at", { ascending: false }),
    client.from("training_history").select("*").order("date", { ascending: false })
  ]);
  if (users.error) throw users.error;
  if (plans.error) throw plans.error;
  if (history.error) throw history.error;
  return {
    users: users.data || [],
    plans: plans.data || [],
    history: history.data || []
  };
}

export async function upsertCloudUser(user) {
  if (!isCloudReady()) return;
  const payload = {
    id: user.id,
    name: user.name,
    gender: user.gender,
    age: user.age,
    height: user.height,
    weight: user.weight,
    goal: user.goal,
    experience: user.experience,
    environment: user.environment || user.location || "gym",
    equipment: user.equipment || [],
    diet_preference: user.diet_preference || "balanced",
    diet_restrictions: user.diet_restrictions || "",
    activity_level: user.activity_level || "moderate"
  };
  const { error } = await client.from("users").upsert(payload);
  if (error) throw error;
}

export async function insertCloudPlan(user, plan) {
  if (!isCloudReady()) return;
  const payload = {
    user_id: user.id,
    plan_json: plan,
    environment: user.environment || user.location || "gym",
    equipment: user.equipment || [],
    created_at: new Date().toISOString()
  };
  const { error } = await client.from("workout_plans").insert(payload);
  if (error) throw error;
}

export async function upsertCloudHistory(userId, history) {
  if (!isCloudReady()) return;
  const payload = history.map((entry) => ({
    user_id: userId,
    date: entry.date,
    completion_rate: entry.completion,
    fatigue_level: entry.fatigue,
    feedback: {
      id: entry.id,
      day: entry.day,
      focus: entry.focus,
      actual_completion: entry.actualCompletion,
      exercise_difficulty: entry.exerciseDifficulty,
      execution_ease: entry.executionEase,
      difficulty: entry.difficulty,
      actual_completion: entry.actualCompletion,
      sleep: entry.sleep,
      note: entry.note
    },
    weight: entry.weight
  }));
  if (!payload.length) return;
  const { error } = await client
    .from("training_history")
    .upsert(payload, { onConflict: "user_id,date" });
  if (error) throw error;
}

export async function deleteCloudUser(userId) {
  if (!isCloudReady()) return;
  await client.from("training_history").delete().eq("user_id", userId);
  await client.from("workout_plans").delete().eq("user_id", userId);
  await client.from("users").delete().eq("id", userId);
}
