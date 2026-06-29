let client = null;
let ready = false;
let lastError = "";

/**
 * V2稳定版：不会阻塞UI + 不会白屏
 */
export async function initializeCloudSync() {
  const config = window.FITPLAN_SUPABASE || {};

  // ❌ 没配置 → 直接本地模式（不报错）
  if (!config.url || !config.anonKey) {
    ready = false;
    return { enabled: false, message: "本地模式" };
  }

  try {
    // ⭐ 关键优化1：静态 CDN（不使用 dynamic import）
    if (!window.supabase) {
      await loadSupabaseCDN();
    }

    client = window.supabase.createClient(
      config.url,
      config.anonKey
    );

    ready = true;
    return { enabled: true, message: "云端同步" };
  } catch (error) {
    ready = false;
    lastError = error?.message || "Supabase连接失败";
    return { enabled: false, message: "本地模式" };
  }
}

/**
 * CDN加载（稳定版，不阻塞UI）
 */
function loadSupabaseCDN() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");

    script.src =
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

    script.async = true;

    script.onload = () => resolve(true);
    script.onerror = () =>
      reject(new Error("Supabase CDN加载失败"));

    document.head.appendChild(script);
  });
}

export function isCloudReady() {
  return ready && !!client;
}

export function getCloudStatus() {
  if (isCloudReady()) return "云端同步";
  return lastError ? "云端失败" : "本地模式";
}

/* =========================
   数据读取（安全增强版）
========================= */

export async function pullCloudSnapshot() {
  if (!isCloudReady()) {
    return { users: [], plans: [], history: [] };
  }

  const [users, plans, history] = await Promise.all([
    client.from("users").select("*"),
    client.from("workout_plans").select("*"),
    client.from("training_history").select("*")
  ]);

  return {
    users: users.data || [],
    plans: plans.data || [],
    history: history.data || []
  };
}

/* =========================
   写入操作（防崩溃版）
========================= */

export async function upsertCloudUser(user) {
  if (!isCloudReady()) return;

  await client.from("users").upsert({
    id: user.id,
    name: user.name,
    gender: user.gender,
    age: user.age,
    height: user.height,
    weight: user.weight,
    goal: user.goal,
    experience: user.experience,
    environment: user.environment || "gym",
    equipment: user.equipment || [],
    diet_preference: user.diet_preference || "balanced",
    diet_restrictions: user.diet_restrictions || "",
    activity_level: user.activity_level || "moderate"
  });
}

export async function insertCloudPlan(user, plan) {
  if (!isCloudReady()) return;

  await client.from("workout_plans").insert({
    user_id: user.id,
    plan_json: plan,
    environment: user.environment || "gym",
    equipment: user.equipment || [],
    created_at: new Date().toISOString()
  });
}

export async function upsertCloudHistory(userId, history) {
  if (!isCloudReady()) return;

  const payload = history.map((e) => ({
    user_id: userId,
    date: e.date,
    completion_rate: e.completion,
    fatigue_level: e.fatigue,
    feedback: e,
    weight: e.weight
  }));

  if (!payload.length) return;

  await client
    .from("training_history")
    .upsert(payload, { onConflict: "user_id,date" });
}

export async function deleteCloudUser(userId) {
  if (!isCloudReady()) return;

  await client.from("training_history").delete().eq("user_id", userId);
  await client.from("workout_plans").delete().eq("user_id", userId);
  await client.from("users").delete().eq("id", userId);
}
