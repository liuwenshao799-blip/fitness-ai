export function adjustWorkoutPlan(user, history) {
  const recent = history.slice(0, 3);
  const reasons = [];
  const diff = [];
  const modifier = {
    volume: user.planModifier?.volume || 0,
    cardio: user.planModifier?.cardio || 0,
    intensity: user.planModifier?.intensity || 0,
    substitutions: user.planModifier?.substitutions || {},
    nutritionCalories: user.planModifier?.nutritionCalories || 0,
    nutritionProtein: user.planModifier?.nutritionProtein || 0,
    nutritionCarbs: user.planModifier?.nutritionCarbs || 0,
    reason: "暂无调整"
  };

  if (recent.length >= 3 && recent.every((item) => item.completion < 60)) {
    modifier.volume = Math.max(-2, modifier.volume - 1);
    reasons.push("连续 3 次完成度低于 60%");
    diff.push("训练量下调，每个主要动作减少 1 组");
  }

  if (recent.length >= 3 && recent.every((item) => item.fatigue >= 4)) {
    modifier.volume = Math.max(-2, modifier.volume - 1);
    modifier.intensity = Math.max(-1, modifier.intensity - 1);
    modifier.nutritionCarbs += 25;
    reasons.push("连续 3 次疲劳偏高");
    diff.push("降低训练量，增加 25g 碳水用于恢复");
  }

  if (recent.length >= 3 && recent.every((item) => item.completion > 90)) {
    modifier.volume = Math.min(2, modifier.volume + 1);
    modifier.intensity = Math.min(1, modifier.intensity + 1);
    reasons.push("连续 3 次完成度高于 90%");
    diff.push("训练量增加，每个主要动作增加 1 组");
  }

  if (recent.some((item) => item.exerciseDifficulty === "太难" || item.executionEase === "困难")) {
    modifier.volume = Math.max(-2, modifier.volume - 1);
    modifier.intensity = Math.max(-1, modifier.intensity - 1);
    modifier.substitutions = {
      ...modifier.substitutions,
      benchPress: "pushUp",
      legPress: "bodySquat",
      latPulldown: "bandRow"
    };
    reasons.push("动作反馈偏难");
    diff.push("自动降低强度，并替换为更容易执行的动作");
  }

  if ((user.environment || user.location) === "home" && hasNoEquipment(user)) {
    modifier.substitutions = {
      ...modifier.substitutions,
      dumbbellSquat: "bodySquat",
      benchPress: "pushUp",
      latPulldown: "bandRow"
    };
    reasons.push("居家无器械");
    diff.push("切换为高重复自重训练");
  }

  const flatWeight = isWeightFlat(history);
  if (flatWeight && history.length >= 4 && user.goal === "fatLoss") {
    modifier.cardio = Math.min(3, modifier.cardio + 1);
    modifier.nutritionCalories -= 150;
    reasons.push("减脂效果偏慢");
    diff.push("增加有氧，并每日热量再降低约 150 kcal");
  }

  if (flatWeight && history.length >= 4 && user.goal === "muscle") {
    modifier.volume = Math.min(2, modifier.volume + 1);
    modifier.nutritionCalories += 150;
    modifier.nutritionProtein += 15;
    reasons.push("增肌效果偏慢");
    diff.push("增加训练容量、蛋白质和总热量");
  }

  const adjustment = {
    adjustment_reason: reasons.length ? reasons.join("；") : "数据稳定，暂不调整计划",
    new_plan_diff: diff.length ? diff : ["保持当前训练和饮食安排"],
    modifier
  };
  adjustment.modifier.reason = adjustment.adjustment_reason;
  return adjustment;
}

function hasNoEquipment(user) {
  const equipment = user.equipment || [];
  return !equipment.length || equipment.includes("无器械");
}

function isWeightFlat(history) {
  const entries = history.filter((item) => Number.isFinite(item.weight)).slice(0, 14);
  if (entries.length < 4) return false;
  return Math.abs(entries[0].weight - entries[entries.length - 1].weight) < 0.3;
}
