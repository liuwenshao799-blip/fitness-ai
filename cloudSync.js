let client = null;
let ready = false;
let lastError = "";

/**
 * 超时包装器（防止Supabase卡死）
 */
function withTimeout(promise, ms = 3000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    )
  ]);
}

/**
 * 初始化云同步（非阻塞版本）
 */
export async function initializeCloudSync() {
  const config = window.FITPLAN_SUPABASE || {};

  if (!config.url || !config.anonKey) {
    ready = false;
    return { enabled: false, message: "本地模式" };
  }

  try {
    const mod = await import(
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"
    );

    client = mod.createClient(config.url, config.anonKey);
    ready = true;

    return { enabled: true, message: "云端同步" };
  } catch (error) {
    ready = false;
    lastError = error.message || "Supabase连接失败";

    return { enabled: false, message: "本地模式" };
  }
}

/**
 * 是否可用云端
 */
export function isCloudReady() {
  return ready && Boolean(client);
}

/**
 * 状态显示
 */
export function getCloudStatus() {
  if (isCloudReady()) return "云端同步";
  return lastError ? "云端连接失败" : "本地模式";
}

/**
 * 拉取云端数据（防卡死版）
 */
export async function pullCloudSnapshot() {
  if (!isCloudReady()) {
    return { users: [], plans: [], history: [] };
  }

  try {
    const [users, plans, history] = await Promise.all([
      withTimeout(client.from("users").select("*")),
      withTimeout(
        client
          .from("workout_plans")
          .select("*")
          .order("created_at", { ascending: false })
      ),
      withTimeout(
        client
          .from("training_history")
          .select("*")
          .order("date", { ascending: false })
      )
    ]);

    return {
      users: users.data || [],
      plans: plans.data || [],
      history: history.data || []
    };
  } catch (err) {
    console.warn("云端加载失败，已降级本地模式:", err);

    return {
      users: [],
      plans: [],
      history: []
    };
  }
}

/**
 * 保存用户（云端）
 */
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

  if (error) {
    console.warn("用户同步失败:", error);
    throw error;
  }
}

/**
 * 保存训练计划
 */
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

  if (error) {
    console.warn("计划同步失败:", error);
    throw error;
  }
}

/**
 * 保存训练记录（批量）
 */
export async function upsertCloudHistory(userId, history) {
  if (!isCloudReady()) return;

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

  if (!payload.length) return;

  const { error } = await client
    .from("training_history")
    .upsert(payload, { onConflict: "user_id,date" });

  if (error) {
    console.warn("训练记录同步失败:", error);
    throw error;
  }
}

/**
 * 删除用户（级联删除）
 */
export async function deleteCloudUser(userId) {
  if (!isCloudReady()) return;

  await client.from("training_history").delete().eq("user_id", userId);
  await client.from("workout_plans").delete().eq("user_id", userId);
  await client.from("users").delete().eq("id", userId);
}