const weekDays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

const actionLibrary = {
  bodySquat: action("自重深蹲", ["股四头肌", "臀大肌"], 4, "15-20", "60秒", [
    "双脚与肩同宽，脚尖微微外展",
    "下蹲时膝盖方向跟随脚尖",
    "起身时收紧臀部并保持核心稳定"
  ], ["膝盖内扣", "弯腰塌背"], "椅子辅助深蹲"),
  dumbbellSquat: action("哑铃杯式深蹲", ["股四头肌", "臀大肌", "核心"], 4, "10-12", "75秒", [
    "哑铃贴近胸口",
    "下蹲到大腿接近平行地面",
    "脚跟稳定发力"
  ], ["重量离身体太远", "起身时膝盖内扣"], "自重深蹲"),
  pushUp: action("俯卧撑", ["胸大肌", "三头肌", "核心"], 4, "8-15", "75秒", [
    "身体从头到脚保持直线",
    "肘部约 45 度打开",
    "下放时胸口接近地面"
  ], ["塌腰", "耸肩"], "跪姿俯卧撑"),
  bandRow: action("弹力带划船", ["背阔肌", "菱形肌", "二头肌"], 4, "12-15", "60秒", [
    "肩胛先后收再拉手肘",
    "保持胸口打开",
    "还原阶段控制速度"
  ], ["只用手臂拉", "身体后仰借力"], "毛巾等长划船"),
  dumbbellRow: action("单臂哑铃划船", ["背阔肌", "后束", "二头肌"], 4, "10-12/侧", "75秒", [
    "背部保持平直",
    "手肘贴近身体向后拉",
    "顶峰停顿 1 秒"
  ], ["耸肩", "扭转身体借力"], "弹力带划船"),
  plank: action("平板支撑", ["腹横肌", "腹直肌", "臀部"], 3, "30-60秒", "45秒", [
    "肘部在肩正下方",
    "收紧腹部和臀部",
    "保持自然呼吸"
  ], ["塌腰", "臀部抬太高"], "死虫"),
  benchPress: action("杠铃卧推", ["胸大肌", "三头肌", "前三角"], 4, "6-10", "120秒", [
    "肩胛后收下沉",
    "杠铃落点在下胸附近",
    "推起时手腕保持中立"
  ], ["肩膀前顶", "弹胸借力"], "俯卧撑"),
  latPulldown: action("高位下拉", ["背阔肌", "二头肌"], 4, "8-12", "90秒", [
    "先下沉肩胛",
    "把手拉向锁骨上方",
    "还原时保持控制"
  ], ["身体过度后仰", "用惯性下拉"], "弹力带下拉"),
  legPress: action("腿举", ["股四头肌", "臀大肌"], 4, "10-12", "90秒", [
    "脚掌完整踩实踏板",
    "膝盖方向跟脚尖一致",
    "最低点不让骨盆卷起"
  ], ["锁死膝盖", "下放过快"], "弓步蹲"),
  shoulderPress: action("哑铃肩推", ["三角肌", "三头肌"], 3, "8-12", "75秒", [
    "核心收紧，肋骨不外翻",
    "哑铃向上推到耳朵两侧",
    "下放到可控深度"
  ], ["腰椎过度后仰", "耸肩发力"], " Pike 俯卧撑"),
  running: action("节奏跑", ["心肺", "臀腿"], 1, "20-30分钟", "稳定配速", [
    "前 5 分钟逐步升速",
    "保持能说短句的强度",
    "结束后慢走 3 分钟"
  ], ["一开始冲太快", "落地声音过大"], "原地高抬腿"),
  hiit: action("户外 HIIT", ["心肺", "全身"], 6, "30秒快 + 60秒慢", "60秒", [
    "快段保持动作质量",
    "慢段主动恢复呼吸",
    "每轮结束检查疲劳"
  ], ["完全憋气", "疲劳后动作变形"], "低冲击开合步"),
  deadBug: action("死虫", ["核心", "髋屈肌"], 3, "10-12/侧", "45秒", [
    "腰背轻贴地面",
    "对侧手脚同时伸展",
    "动作慢，不追求速度"
  ], ["腰离地", "手脚乱晃"], "平板支撑"),
  bandChestPress: action("弹力带推胸", ["胸大肌", "三头肌"], 4, "12-15", "60秒", [
    "弹力带固定在背后",
    "推到手臂接近伸直",
    "还原时控制张力"
  ], ["耸肩", "弹力带忽松忽紧"], "俯卧撑"),
  curlBar: action("臂力棒夹胸", ["胸大肌", "前臂"], 3, "10-15", "60秒", [
    "保持手腕中立",
    "发力时呼气",
    "慢速还原"
  ], ["手腕折弯", "快速弹回"], "窄距俯卧撑")
};

export function generateWorkoutPlan(user) {
  const environment = user.environment || user.location || "gym";
  const activeDays = Math.max(3, Math.min(6, Number(user.trainingDays) || 4));
  const pattern = choosePattern(user, environment, activeDays);
  const days = weekDays.map((day, index) => {
    const focus = index < activeDays ? pattern[index % pattern.length] : "recovery";
    return buildTrainingDay(day, focus, user, environment, index);
  });

  return {
    generatedAt: new Date().toISOString(),
    userId: user.id,
    goal: user.goal,
    experience: user.experience,
    environment,
    equipment: user.equipment || [],
    days
  };
}

export const createWorkoutPlan = generateWorkoutPlan;

function choosePattern(user, environment, days) {
  if (environment === "outdoor") return ["outdoorCardio", "outdoorCore", "hiit", "outdoorCardio", "outdoorCore", "hiit"];
  if (environment === "home") {
    if (days === 3) return ["homeFull", "homeCore", "homeFull"];
    if (days === 4) return ["homeFull", "homeUpper", "homeLower", "homeCore"];
    return ["homeFull", "homeUpper", "homeLower", "homeCore", "hiit", "homeFull"];
  }
  if (user.experience === "advanced" || days >= 5) return ["push", "pull", "legs", "push", "pull", "legs"];
  if (days === 3) return ["full", "upper", "lower"];
  return ["upper", "lower", "push", "pull"];
}

function buildTrainingDay(day, focusType, user, environment, index) {
  const modifier = user.planModifier || {};
  const exerciseIds = chooseExercises(focusType, user, environment).map((id) => modifier.substitutions?.[id] || id);
  const tag = tagForFocus(focusType);
  const exercises = exerciseIds.map((id) => applyModifier(actionLibrary[id], user, modifier));
  const extra = environment === "home" && hasNoEquipment(user)
    ? "无器械居家模式：采用高重复自重训练。"
    : environment === "outdoor"
      ? "户外模式：以跑步、HIIT 和核心为主。"
      : "健身房模式：使用器械和分化训练。";
  return {
    day,
    index,
    focus: focusLabel(focusType, user.goal),
    tag,
    environment,
    equipment: user.equipment || [],
    detail: `${extra} ${difficultyText(user)} ${user.injury === "yes" ? "有伤病时避开疼痛动作。" : ""}`.trim(),
    exercises
  };
}

function chooseExercises(focusType, user, environment) {
  if (environment === "outdoor") {
    if (focusType === "hiit") return ["hiit", "bodySquat", "pushUp", "plank"];
    if (focusType === "outdoorCore") return ["deadBug", "plank", "bodySquat"];
    return ["running", "bodySquat", "pushUp", "deadBug"];
  }

  if (environment === "home") {
    const equipment = user.equipment || [];
    const hasDumbbell = equipment.includes("哑铃");
    const hasBand = equipment.includes("弹力带");
    const hasCurlBar = equipment.includes("臂力棒");
    if (hasNoEquipment(user)) return ["bodySquat", "pushUp", "plank", "deadBug"];
    if (focusType === "homeUpper") return [hasBand ? "bandChestPress" : "pushUp", hasBand ? "bandRow" : "plank", hasCurlBar ? "curlBar" : "pushUp"];
    if (focusType === "homeLower") return [hasDumbbell ? "dumbbellSquat" : "bodySquat", "bodySquat", "plank"];
    if (focusType === "homeCore") return ["deadBug", "plank", hasBand ? "bandRow" : "pushUp"];
    return [hasDumbbell ? "dumbbellSquat" : "bodySquat", hasBand ? "bandRow" : "pushUp", "plank", "deadBug"];
  }

  if (focusType === "push") return ["benchPress", "shoulderPress", "bandChestPress", "pushUp"];
  if (focusType === "pull") return ["latPulldown", "dumbbellRow", "bandRow", "plank"];
  if (focusType === "legs") return ["legPress", "dumbbellSquat", "bodySquat", "plank"];
  if (focusType === "upper") return ["benchPress", "latPulldown", "shoulderPress", "dumbbellRow"];
  if (focusType === "lower") return ["legPress", "dumbbellSquat", "bodySquat", "deadBug"];
  return ["dumbbellSquat", "benchPress", "latPulldown", "plank"];
}

function applyModifier(exercise, user, modifier) {
  const volume = Number(modifier.volume || 0);
  const intensity = Number(modifier.intensity || 0);
  const noEquipmentBonus = hasNoEquipment(user) ? 6 : 0;
  return {
    ...exercise,
    sets: Math.max(1, exercise.sets + volume),
    reps: noEquipmentBonus && /\d/.test(exercise.reps) ? `${exercise.reps} + ${noEquipmentBonus}` : exercise.reps,
    rest: intensity < 0 ? "90-120秒" : exercise.rest
  };
}

function action(name, targetMuscles, sets, reps, rest, cues, commonMistakes, homeAlternative) {
  return { name, targetMuscles, sets, reps, rest, cues, commonMistakes, homeAlternative };
}

function hasNoEquipment(user) {
  const equipment = user.equipment || [];
  return !equipment.length || equipment.includes("无器械");
}

function focusLabel(focusType, goal) {
  const labels = {
    homeFull: "居家全身训练",
    homeUpper: "居家上肢训练",
    homeLower: "居家下肢训练",
    homeCore: "居家核心训练",
    outdoorCardio: "户外跑步训练",
    outdoorCore: "户外核心训练",
    hiit: "HIIT 间歇训练",
    push: "Push 推部训练",
    pull: "Pull 拉部训练",
    legs: "Legs 腿部训练",
    upper: "上肢力量",
    lower: "下肢力量",
    full: "全身力量",
    recovery: "恢复活动"
  };
  const suffix = goal === "fatLoss" ? " + 燃脂" : goal === "muscle" ? " + 增肌" : goal === "shaping" ? " + 塑形" : " + 健康";
  return `${labels[focusType] || "综合训练"}${suffix}`;
}

function tagForFocus(focusType) {
  if (focusType.includes("outdoor") || focusType === "hiit") return "户外";
  if (focusType.includes("home")) return "居家";
  if (focusType === "recovery") return "恢复";
  if (["push", "pull", "legs"].includes(focusType)) return "分化";
  return "力量";
}

function difficultyText(user) {
  if (user.experience === "beginner") return "新手强度，优先动作稳定。";
  if (user.experience === "advanced") return "高级强度，容量更高。";
  return "中级强度，保持可持续进步。";
}
