const activityFactors = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725
};

const activityLabels = {
  sedentary: "久坐",
  light: "轻度活动",
  moderate: "中等活动",
  active: "高活动"
};

const preferenceLabels = {
  balanced: "均衡饮食",
  highProtein: "高蛋白",
  lowCarb: "低碳",
  vegetarian: "素食"
};

export function generateDietPlan(user, history = []) {
  const bmr = calculateBmr(user);
  const tdee = Math.round(bmr * (activityFactors[user.activity_level] || activityFactors[user.activityLevel] || 1.55));
  const adjustment = calorieAdjustment(user, history);
  const calories = Math.max(1200, tdee + adjustment.delta);
  const macros = calculateMacros(user, calories, adjustment);

  return {
    generatedAt: new Date().toISOString(),
    userId: user.id,
    bmr,
    tdee,
    dailyCalories: calories,
    calorieAdjustment: adjustment,
    macros,
    meals: buildMeals(user, macros),
    foodExamples: foodExamples(user),
    advice: buildAdvice(user, adjustment),
    dietPreference: user.diet_preference || user.dietPreference || "balanced",
    dietRestrictions: user.diet_restrictions || user.dietRestrictions || "",
    activityLevel: user.activity_level || user.activityLevel || "moderate"
  };
}

export function calculateBmr(user) {
  const weight = Number(user.weight) || 65;
  const height = Number(user.height) || 170;
  const age = Number(user.age) || 28;
  const isFemale = user.gender === "女";
  const base = 10 * weight + 6.25 * height - 5 * age;
  return Math.round(base + (isFemale ? -161 : 5));
}

function calorieAdjustment(user, history) {
  const recent = history.slice(0, 3);
  const fatigueHigh = recent.length >= 3 && recent.every((item) => Number(item.fatigue) >= 4);
  const poorProgress = isWeightFlat(history);
  const goal = user.goal;

  if (fatigueHigh) {
    return {
      delta: goal === "fatLoss" ? -250 : 150,
      reason: "近期疲劳偏高，增加恢复碳水并降低训练量"
    };
  }
  if (goal === "fatLoss") {
    return {
      delta: poorProgress ? -500 : -350,
      reason: poorProgress ? "减脂效果偏慢，热量缺口略微扩大" : "减脂目标，保持温和热量缺口"
    };
  }
  if (goal === "muscle") {
    return {
      delta: poorProgress ? 350 : 250,
      reason: poorProgress ? "增肌效果偏慢，增加热量和蛋白质" : "增肌目标，保持小幅热量盈余"
    };
  }
  return { delta: 0, reason: "维持或健康目标，热量接近 TDEE" };
}

function calculateMacros(user, calories, adjustment) {
  const weight = Number(user.weight) || 65;
  const preference = user.diet_preference || user.dietPreference || "balanced";
  const fatigueRecovery = adjustment.reason.includes("疲劳");
  let proteinPerKg = user.goal === "muscle" ? 2 : 1.7;
  if (preference === "highProtein") proteinPerKg += 0.2;
  const protein = Math.round(weight * proteinPerKg);
  const fatRatio = preference === "lowCarb" ? 0.32 : 0.25;
  const fat = Math.round((calories * fatRatio) / 9);
  const carbCalories = calories - protein * 4 - fat * 9;
  const carbs = Math.max(80, Math.round(carbCalories / 4) + (fatigueRecovery ? 25 : 0));
  return { protein, carbs, fat };
}

function buildMeals(user, macros) {
  const vegetarian = (user.diet_preference || user.dietPreference) === "vegetarian";
  const protein = vegetarian ? "豆腐、鸡蛋、希腊酸奶或豆类" : "鸡胸肉、鱼、牛肉、鸡蛋或酸奶";
  return [
    {
      name: "早餐",
      target: "蛋白质 + 慢碳水",
      examples: [`燕麦 + ${vegetarian ? "豆浆" : "鸡蛋"}`, "水果一份", "坚果少量"]
    },
    {
      name: "午餐",
      target: "主蛋白 + 主食 + 蔬菜",
      examples: [protein, "米饭/土豆/全麦面", "深色蔬菜两拳"]
    },
    {
      name: "晚餐",
      target: "高蛋白 + 易消化",
      examples: [protein, "蔬菜沙拉或熟蔬菜", `碳水按训练量补足，全天目标 ${macros.carbs}g`]
    }
  ];
}

function foodExamples(user) {
  const restrictions = String(user.diet_restrictions || user.dietRestrictions || "")
    .split(/[，,、]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const base = ["鸡蛋", "鱼肉", "鸡胸肉", "豆腐", "燕麦", "米饭", "红薯", "西兰花", "香蕉", "酸奶"];
  return base.filter((food) => !restrictions.some((item) => food.includes(item)));
}

function buildAdvice(user, adjustment) {
  const preference = preferenceLabels[user.diet_preference || user.dietPreference] || "均衡饮食";
  const activity = activityLabels[user.activity_level || user.activityLevel] || "中等活动";
  return [
    `${preference} + ${activity}，当前热量策略：${adjustment.reason}。`,
    "每餐先保证蛋白质，再安排主食和蔬菜。",
    "训练日前后优先补充碳水，休息日保持蛋白质稳定。",
    "每周看 7-14 天趋势，不用被单日体重波动影响。"
  ];
}

function isWeightFlat(history) {
  const weights = history.filter((item) => Number.isFinite(item.weight)).slice(0, 14);
  if (weights.length < 4) return false;
  return Math.abs(weights[0].weight - weights[weights.length - 1].weight) < 0.3;
}
