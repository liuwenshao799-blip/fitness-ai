let client = null;
let ready = false;
let loadingPromise = null;
let lastError = "";

const CDN_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const DEFAULT_TIMEOUT = 2500;

function timeoutAfter(ms, label = "timeout") {
  return new Promise((_, reject) => {
    window.setTimeout(() => reject(new Error(label)), ms);
  });
}

function withTimeout(promise, ms = DEFAULT_TIMEOUT, label) {
  return Promise.race([promise, timeoutAfter(ms, label)]);
}

function hasConfig() {
  const config = window.FITPLAN_SUPABASE || {};
  return Boolean(config.url && config.anonKey);
}

function fallback(message = "本地模式", error = "") {
  ready = false;
  lastError = error;
  return { enabled: false, message };
}

async function safeQuery(task, fallbackValue = null, timeout = DEFAULT_TIMEOUT) {
  if (!isCloudReady()) return fallbackValue;
  try {
    const result = await withTimeout(task(), timeout, "supabase request timeout");
    if (result?.error) {
      lastError = result.error.message || "Supabase request failed";
      return fallbackValue;
    }
    return result;
  } catch (error) {
    lastError = error.message || "Supabase request failed";
    return fallbackValue;
  }
}

export async function initializeCloudSync() {
  if (!hasConfig()) return fallback("本地模式");
  if (ready && client) return { enabled: true, message: "云端同步" };
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const config = window.FITPLAN_SUPABASE;
      const mod = await withTimeout(import(CDN_URL), 1800, "supabase cdn timeout");
      client = mod.createClient(config.url, config.anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        },
        global: {
          headers: { "x-client-info": "fitplan-static-web" }
        }
      });
      ready = true;
      lastError = "";
      return { enabled: true, message: "云端同步" };
    } catch (error) {
      client = null;
      return fallback("本地模式", error.message || "Supabase init failed");
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
}

export function isCloudReady() {
  return ready && Boolean(client);
}

export function getCloudStatus() {
  if (isCloudReady()) return "云端同步";
  return lastError ? "本地模式" : "本地模式";
}

export async function pullCloudSnapshot() {
  if (!isCloudReady()) return { users: [], plans: [], history: [] };

  const [users, plans, history] = await Promise.all([
    safeQuery(() => client.from("users").select("*"), { data: [] }),
    safeQuery(
      () => client.from("workout_plans").select("*").order("created_at", { ascending: false }),
      { data: [] }
    ),
    safeQuery(
      () => client.from("training_history").select("*").order("date", { ascending: false }),
      { data: [] }
    )
  ]);

  return {
    users: users?.data || [],
    plans: plans?.data || [],
    history: history?.data || []
  };
}

export async function upsertCloudUser(user) {
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
  const result = await safeQuery(() => client.from("users").upsert(payload), null);
  return Boolean(result);
}

export async function insertCloudPlan(user, plan) {
  const payload = {
    user_id: user.id,
    plan_json: plan,
    environment: user.environment || user.location || "gym",
    equipment: user.equipment || [],
    created_at: new Date().toISOString()
  };
  const result = await safeQuery(() => client.from("workout_plans").insert(payload), null);
  return Boolean(result);
}

export async function upsertCloudHistory(userId, history) {
  const payload = history.map((entry) => ({
    user_id: userId,
    date: entry.date,
    completion_rate: entry.completion,
    fatigue_level: entry.fatigue,
    weight: entry.weight,
    feedback: {
      id: entry.id,
      day: entry.day,
      focus: entry.focus,
      actual_completion: entry.actualCompletion,
      exercise_difficulty: entry.exerciseDifficulty,
      execution_ease: entry.executionEase,
      difficulty: entry.difficulty,
      sleep: entry.sleep,
      note: entry.note
    }
  }));

  if (!payload.length) return false;
  const result = await safeQuery(
    () => client.from("training_history").upsert(payload, { onConflict: "user_id,date" }),
    null
  );
  return Boolean(result);
}

export async function deleteCloudUser(userId) {
  if (!isCloudReady()) return false;
  await safeQuery(() => client.from("training_history").delete().eq("user_id", userId), null);
  await safeQuery(() => client.from("workout_plans").delete().eq("user_id", userId), null);
  const result = await safeQuery(() => client.from("users").delete().eq("id", userId), null);
  return Boolean(result);
}
