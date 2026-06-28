import {
  getCurrentUserId,
  listUserIds,
  loadUser,
  removeUser,
  saveUser,
  setCurrentUserId
} from "./storage.js";

export const goalLabels = {
  fatLoss: "减脂",
  muscle: "增肌",
  shaping: "塑形",
  health: "健康"
};

export const environmentLabels = {
  home: "居家",
  gym: "健身房",
  outdoor: "户外"
};

export function createDefaultUser(name = "默认用户") {
  const id = `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  return {
    id,
    name,
    gender: "未设置",
    age: 28,
    height: 170,
    weight: 65,
    goal: "fatLoss",
    experience: "intermediate",
    environment: "gym",
    location: "gym",
    equipment: ["哑铃", "瑜伽垫"],
    diet_preference: "balanced",
    diet_restrictions: "",
    activity_level: "moderate",
    trainingDays: 4,
    injury: "no",
    done: {},
    planModifier: {
      volume: 0,
      cardio: 0,
      intensity: 0,
      substitutions: {},
      reason: "暂无调整"
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function normalizeUser(user) {
  return {
    ...createDefaultUser(user?.name || "默认用户"),
    ...user,
    environment: user?.environment || user?.location || "gym",
    location: user?.environment || user?.location || "gym",
    equipment: Array.isArray(user?.equipment) ? user.equipment : ["哑铃", "瑜伽垫"],
    diet_preference: user?.diet_preference || user?.dietPreference || "balanced",
    diet_restrictions: user?.diet_restrictions || user?.dietRestrictions || "",
    activity_level: user?.activity_level || user?.activityLevel || "moderate",
    done: user?.done || {},
    planModifier: {
      volume: 0,
      cardio: 0,
      intensity: 0,
      substitutions: {},
      reason: "暂无调整",
      ...(user?.planModifier || {})
    }
  };
}

export function migrateLegacyUser() {
  const user = createDefaultUser("默认用户");
  const legacyGoal = localStorage.getItem("fitplanGoal");
  const legacyDone = safeParse(localStorage.getItem("fitplanDone"), {});
  if (legacyGoal === "muscle") user.goal = "muscle";
  if (legacyGoal === "balanced") user.goal = "health";
  if (legacyGoal === "fatLoss") user.goal = "fatLoss";
  user.done = Object.entries(legacyDone).reduce((acc, [key, value]) => {
    if (value) acc[key] = true;
    return acc;
  }, {});
  saveUser(user);
  setCurrentUserId(user.id);
  return user;
}

export function ensureUser() {
  const ids = listUserIds();
  const currentId = getCurrentUserId();
  if (currentId && ids.includes(currentId)) return normalizeUser(loadUser(currentId));
  if (ids.length) {
    setCurrentUserId(ids[0]);
    return normalizeUser(loadUser(ids[0]));
  }
  return migrateLegacyUser();
}

export function getAllUsers() {
  return listUserIds().map(loadUser).filter(Boolean).map(normalizeUser);
}

export function setActiveUser(userId) {
  setCurrentUserId(userId);
  return normalizeUser(loadUser(userId));
}

export function addUser(name) {
  const user = createDefaultUser(name || `用户 ${getAllUsers().length + 1}`);
  saveUser(user);
  setCurrentUserId(user.id);
  return user;
}

export function deleteUser(userId) {
  const users = getAllUsers();
  if (users.length <= 1) return normalizeUser(loadUser(userId));
  removeUser(userId);
  const nextUser = getAllUsers()[0];
  setCurrentUserId(nextUser.id);
  return nextUser;
}

export function updateUserProfile(user, profile) {
  const updated = normalizeUser({
    ...user,
    ...profile,
    age: Number(profile.age),
    height: Number(profile.height),
    weight: Number(profile.weight),
    trainingDays: Number(profile.trainingDays),
    environment: profile.environment || profile.location,
    location: profile.environment || profile.location,
    equipment: profile.equipment || [],
    diet_preference: profile.diet_preference || profile.dietPreference || "balanced",
    diet_restrictions: profile.diet_restrictions || profile.dietRestrictions || "",
    activity_level: profile.activity_level || profile.activityLevel || "moderate",
    updatedAt: new Date().toISOString()
  });
  saveUser(updated);
  return updated;
}

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}
