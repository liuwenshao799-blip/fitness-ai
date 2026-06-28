import { adjustWorkoutPlan } from "./adjuster.js";
import { renderCharts, renderMacroChart } from "./chart.js";
import {
  deleteCloudUser,
  initializeCloudSync,
  insertCloudPlan,
  pullCloudSnapshot,
  upsertCloudHistory,
  upsertCloudUser
} from "./cloudSync.js";
import { generateDietPlan } from "./dietGenerator.js";
import {
  addTrainingFeedback,
  calculateStreak,
  currentWeekKeys,
  getRecentHistory,
  todayKey
} from "./feedback.js";
import { createWorkoutPlan } from "./planGenerator.js";
import {
  addUser,
  deleteUser,
  ensureUser,
  getAllUsers,
  goalLabels,
  setActiveUser,
  updateUserProfile
} from "./userManager.js";
import { importCloudSnapshot, loadHistory, saveUser } from "./storage.js";

let currentUser = ensureUser();
let currentPlan = createWorkoutPlan(currentUser);
let currentDiet = generateDietPlan(currentUser, loadHistory(currentUser.id));

const nodes = {
  userSelect: document.querySelector("#userSelect"),
  newUserName: document.querySelector("#newUserName"),
  addUserButton: document.querySelector("#addUserButton"),
  deleteUserButton: document.querySelector("#deleteUserButton"),
  syncStatus: document.querySelector("#syncStatus"),
  weekGrid: document.querySelector("#weekGrid"),
  completedCount: document.querySelector("#completedCount"),
  streakCount: document.querySelector("#streakCount"),
  completionRate: document.querySelector("#completionRate"),
  todayDay: document.querySelector("#todayDay"),
  todayFocus: document.querySelector("#todayFocus"),
  todayDetail: document.querySelector("#todayDetail"),
  toggleToday: document.querySelector("#toggleToday"),
  profileForm: document.querySelector("#profileForm"),
  feedbackForm: document.querySelector("#feedbackForm"),
  recommendation: document.querySelector("#recommendation"),
  aiAdvice: document.querySelector("#aiAdvice"),
  historyList: document.querySelector("#historyList"),
  dietCard: document.querySelector("#dietCard"),
  dietAdvice: document.querySelector("#dietAdvice")
};

function todayIndex() {
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
}

function activeDay() {
  return currentPlan.days[todayIndex()];
}

async function boot() {
  const cloud = await initializeCloudSync();
  setSyncStatus(cloud.message);
  try {
    if (cloud.enabled) {
      importCloudSnapshot(await pullCloudSnapshot());
      currentUser = ensureUser();
      await syncUser();
    }
  } catch (error) {
    setSyncStatus("云端连接失败");
  }
  render();
}

function render() {
  const history = loadHistory(currentUser.id);
  currentPlan = createWorkoutPlan(currentUser);
  currentDiet = generateDietPlan(currentUser, history);
  currentUser.plan = currentPlan;
  currentUser.dietPlan = currentDiet;
  saveUser(currentUser);
  renderUsers();
  renderSegments();
  renderProfile();
  renderToday();
  renderWeek();
  renderProgress();
  renderAdvice();
  renderDiet();
  renderHistory();
  renderCharts(history, currentUser.done);
  renderMacroChart(currentDiet);
}

function renderUsers() {
  const users = getAllUsers();
  nodes.userSelect.innerHTML = users
    .map((user) => `<option value="${user.id}">${escapeHtml(user.name)}</option>`)
    .join("");
  nodes.userSelect.value = currentUser.id;
  nodes.deleteUserButton.disabled = users.length <= 1;
}

function renderSegments() {
  document.querySelectorAll(".segment").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.goal === currentUser.goal);
  });
}

function renderProfile() {
  setValue("name", currentUser.name);
  setValue("gender", currentUser.gender);
  setValue("age", currentUser.age);
  setValue("height", currentUser.height);
  setValue("weight", currentUser.weight);
  setValue("goalInput", currentUser.goal);
  setValue("experience", currentUser.experience);
  setValue("days", currentUser.trainingDays);
  setValue("location", currentUser.environment || currentUser.location);
  setValue("injury", currentUser.injury);
  setValue("dietPreference", currentUser.diet_preference);
  setValue("dietRestrictions", currentUser.diet_restrictions);
  setValue("activityLevel", currentUser.activity_level);
  setValue("feedbackWeight", currentUser.weight);
  setEquipmentValues(currentUser.equipment || []);
  updateRecommendation();
}

function renderToday() {
  const item = activeDay();
  const done = Boolean(currentUser.done[todayKey()]);
  nodes.todayDay.textContent = item.day;
  nodes.todayFocus.textContent = item.focus;
  nodes.todayDetail.textContent = item.detail;
  nodes.toggleToday.classList.toggle("is-done", done);
  nodes.toggleToday.setAttribute("aria-pressed", String(done));
  nodes.toggleToday.lastElementChild.textContent = done ? "已完成" : "完成";
}

function renderWeek() {
  const weekKeys = currentWeekKeys();
  nodes.weekGrid.innerHTML = "";
  currentPlan.days.forEach((item, index) => {
    const key = weekKeys[index];
    const card = document.createElement("article");
    card.className = "day-card";
    card.classList.toggle("is-done", Boolean(currentUser.done[key]));
    card.innerHTML = `
      <span class="tag">${item.tag}</span>
      <h3>${item.day} · ${item.focus}</h3>
      <p>${item.detail}</p>
      <div class="exercise-list">
        ${item.exercises.map((exercise) => `
          <span>
            ${exercise.name} · ${exercise.targetMuscles.join("/")} · ${exercise.sets} 组 · ${exercise.reps} · 休息 ${exercise.rest}
            <small>要点：${exercise.cues.join("；")}。常见错误：${exercise.commonMistakes.join("；")}。居家替代：${exercise.homeAlternative}</small>
          </span>
        `).join("")}
      </div>
    `;
    card.addEventListener("click", () => {
      currentUser.done[key] = !currentUser.done[key];
      currentUser.updatedAt = new Date().toISOString();
      saveUser(currentUser);
      syncUser();
      render();
    });
    nodes.weekGrid.appendChild(card);
  });
}

function renderProgress() {
  const weekKeys = currentWeekKeys();
  const count = weekKeys.filter((key) => currentUser.done[key]).length;
  const activeDays = Number(currentUser.trainingDays) || 4;
  nodes.completedCount.textContent = `${count}/7`;
  nodes.streakCount.textContent = `${calculateStreak(currentUser.done)}天`;
  nodes.completionRate.textContent = `${Math.round((count / activeDays) * 100)}%`;
}

function renderAdvice() {
  const history = loadHistory(currentUser.id);
  const adjustment = adjustWorkoutPlan(currentUser, history);
  nodes.aiAdvice.innerHTML = `
    <strong>AI 调整建议</strong>
    <p>${adjustment.adjustment_reason}</p>
    <ul>${adjustment.new_plan_diff.map((item) => `<li>${item}</li>`).join("")}</ul>
  `;
}

function renderDiet() {
  const diet = currentDiet;
  nodes.dietCard.innerHTML = `
    <h3>每日热量统计</h3>
    <p><strong>${diet.dailyCalories} kcal</strong> · BMR ${diet.bmr} · TDEE ${diet.tdee}</p>
    <div class="macro-row">
      <span>蛋白质 <strong>${diet.macros.protein}g</strong></span>
      <span>碳水 <strong>${diet.macros.carbs}g</strong></span>
      <span>脂肪 <strong>${diet.macros.fat}g</strong></span>
    </div>
    <ul class="meal-list">
      ${diet.meals.map((meal) => `<li><strong>${meal.name}</strong>：${meal.target}，${meal.examples.join(" / ")}</li>`).join("")}
    </ul>
  `;
  nodes.dietAdvice.innerHTML = `
    <h3>饮食建议</h3>
    <ul class="advice-list">
      ${diet.advice.map((item) => `<li>${item}</li>`).join("")}
      <li>食物示例：${diet.foodExamples.join("、")}</li>
      <li>忌口：${diet.dietRestrictions || "未设置"}</li>
    </ul>
  `;
}

function renderHistory() {
  const recent = getRecentHistory(currentUser.id, 7);
  if (!recent.length) {
    nodes.historyList.innerHTML = `<div class="history-empty">还没有训练反馈。完成今日训练后会在这里显示记录。</div>`;
    return;
  }
  nodes.historyList.innerHTML = recent.map((entry) => `
    <article class="history-item">
      <div>
        <strong>${entry.date}</strong>
        <span>${entry.day}</span>
      </div>
      <div>
        <strong>${entry.focus}</strong>
        <p>体重 ${entry.weight || "-"} kg · 完成 ${entry.completion}% · 疲劳 ${entry.fatigue}/5 · ${entry.exerciseDifficulty || "适中"} · ${entry.executionEase || "简单"}</p>
        ${entry.note ? `<p>${escapeHtml(entry.note)}</p>` : ""}
      </div>
      <span>${entry.difficulty}</span>
    </article>
  `).join("");
}

function updatePlanAfterProfile(profile) {
  currentUser = updateUserProfile(currentUser, profile);
  const history = loadHistory(currentUser.id);
  const adjustment = adjustWorkoutPlan(currentUser, history);
  currentUser.planModifier = adjustment.modifier;
  saveUser(currentUser);
  render();
  syncUser();
}

nodes.userSelect.addEventListener("change", () => {
  currentUser = setActiveUser(nodes.userSelect.value);
  render();
});

nodes.addUserButton.addEventListener("click", () => {
  const name = nodes.newUserName.value.trim() || `用户 ${getAllUsers().length + 1}`;
  currentUser = addUser(name);
  nodes.newUserName.value = "";
  render();
  syncUser();
});

nodes.deleteUserButton.addEventListener("click", async () => {
  const ok = confirm(`确定删除 ${currentUser.name} 吗？该用户的训练记录也会删除。`);
  if (!ok) return;
  const deletedId = currentUser.id;
  currentUser = deleteUser(currentUser.id);
  await deleteCloudUser(deletedId).catch(() => setSyncStatus("云端连接失败"));
  render();
});

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => updatePlanAfterProfile({ ...readProfile(), goal: button.dataset.goal }));
});

nodes.toggleToday.addEventListener("click", () => {
  const key = todayKey();
  currentUser.done[key] = !currentUser.done[key];
  currentUser.updatedAt = new Date().toISOString();
  saveUser(currentUser);
  nodes.feedbackForm.classList.toggle("is-hidden", !currentUser.done[key]);
  render();
  syncUser();
});

nodes.profileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  updatePlanAfterProfile(readProfile());
});

nodes.profileForm.addEventListener("change", () => updatePlanAfterProfile(readProfile()));

nodes.feedbackForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const history = addTrainingFeedback(currentUser.id, activeDay(), readFeedback());
  const adjustment = adjustWorkoutPlan(currentUser, history);
  currentUser.planModifier = adjustment.modifier;
  currentUser.weight = Number(getValue("feedbackWeight")) || currentUser.weight;
  saveUser(currentUser);
  nodes.feedbackForm.classList.add("is-hidden");
  render();
  await syncUser();
  await upsertCloudHistory(currentUser.id, history).catch(() => setSyncStatus("云端连接失败"));
});

function readProfile() {
  return {
    name: getValue("name") || currentUser.name,
    gender: getValue("gender"),
    age: getValue("age"),
    height: getValue("height"),
    weight: getValue("weight"),
    goal: getValue("goalInput"),
    experience: getValue("experience"),
    trainingDays: getValue("days"),
    environment: getValue("location"),
    location: getValue("location"),
    injury: getValue("injury"),
    equipment: getEquipmentValues(),
    diet_preference: getValue("dietPreference"),
    diet_restrictions: getValue("dietRestrictions"),
    activity_level: getValue("activityLevel")
  };
}

function readFeedback() {
  return {
    weight: getValue("feedbackWeight") || currentUser.weight,
    completion: getValue("feedbackCompletion") || 100,
    fatigue: getValue("feedbackFatigue") || 3,
    difficulty: getValue("feedbackDifficulty"),
    actualCompletion: getValue("feedbackActual"),
    exerciseDifficulty: getValue("feedbackExerciseDifficulty"),
    executionEase: getValue("feedbackExecutionEase"),
    sleep: getValue("feedbackSleep") || 7,
    note: getValue("feedbackNote")
  };
}

function updateRecommendation() {
  if (!nodes.recommendation || !currentUser) return;
  const height = Number(currentUser.height) / 100;
  const weight = Number(currentUser.weight);
  const bmi = height && weight ? weight / (height * height) : 0;
  const activeText = `${goalLabels[currentUser.goal]} · 每周 ${currentUser.trainingDays} 天 · ${currentUser.environment === "home" ? "居家" : currentUser.environment === "outdoor" ? "户外" : "健身房"}`;
  nodes.recommendation.textContent = `BMI ${bmi.toFixed(1)}，${activeText}，饮食目标 ${currentDiet?.dailyCalories || "-"} kcal。`;
}

async function syncUser() {
  try {
    await upsertCloudUser(currentUser);
    await insertCloudPlan(currentUser, currentPlan);
    setSyncStatus("云端同步");
  } catch (error) {
    setSyncStatus("本地已保存");
  }
}

function setSyncStatus(text) {
  if (nodes.syncStatus) nodes.syncStatus.textContent = text;
}

function setValue(id, value) {
  const node = document.querySelector(`#${id}`);
  if (node) node.value = value ?? "";
}

function getValue(id) {
  return document.querySelector(`#${id}`)?.value;
}

function getEquipmentValues() {
  return [...document.querySelectorAll('input[name="equipment"]:checked')].map((item) => item.value);
}

function setEquipmentValues(values) {
  document.querySelectorAll('input[name="equipment"]').forEach((input) => {
    input.checked = values.includes(input.value);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

boot();
