export function renderCharts(history, done) {
  renderWeightChart(document.querySelector("#weightChart"), history);
  renderCompletionChart(document.querySelector("#completionChart"), history, done);
}

export function renderMacroChart(dietPlan) {
  const canvas = document.querySelector("#macroChart");
  if (!canvas || !dietPlan) return;
  const values = [
    { label: "蛋白", value: dietPlan.macros.protein, color: "#0f766e" },
    { label: "碳水", value: dietPlan.macros.carbs, color: "#e66b4f" },
    { label: "脂肪", value: dietPlan.macros.fat, color: "#f4b24a" }
  ];
  drawDonutChart(canvas, values);
}

function renderWeightChart(canvas, history) {
  if (!canvas) return;
  const points = history
    .filter((item) => Number.isFinite(item.weight))
    .slice(0, 14)
    .reverse();
  const values = points.map((item) => item.weight);
  drawLineChart(canvas, values, "kg", "#0f766e");
}

function renderCompletionChart(canvas, history, done) {
  if (!canvas) return;
  const values = history.slice(0, 7).reverse().map((item) => item.completion);
  if (!values.length) {
    const doneCount = Object.values(done || {}).filter(Boolean).length;
    values.push(doneCount ? 100 : 0);
  }
  drawBarChart(canvas, values, "%", "#e66b4f");
}

function setupCanvas(canvas) {
  const context = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || canvas.width;
  const height = canvas.clientHeight || canvas.height;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  context.scale(ratio, ratio);
  context.clearRect(0, 0, width, height);
  return { context, width, height };
}

function drawLineChart(canvas, values, unit, color) {
  const { context, width, height } = setupCanvas(canvas);
  drawEmptyState(context, width, height, values, "暂无体重数据");
  if (!values.length) return;
  const padding = 34;
  const min = Math.min(...values) - 0.5;
  const max = Math.max(...values) + 0.5;
  const range = Math.max(1, max - min);
  context.strokeStyle = "#dce5df";
  context.lineWidth = 1;
  drawGrid(context, width, height, padding);
  context.beginPath();
  values.forEach((value, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(1, values.length - 1);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.strokeStyle = color;
  context.lineWidth = 3;
  context.stroke();
  values.forEach((value, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(1, values.length - 1);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, 4, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#65716d";
    context.font = "12px Arial";
    context.fillText(`${value}${unit}`, x - 18, y - 10);
  });
}

function drawBarChart(canvas, values, unit, color) {
  const { context, width, height } = setupCanvas(canvas);
  drawEmptyState(context, width, height, values, "暂无完成率数据");
  if (!values.length) return;
  const padding = 34;
  drawGrid(context, width, height, padding);
  const barGap = 10;
  const barWidth = (width - padding * 2 - barGap * (values.length - 1)) / values.length;
  values.forEach((value, index) => {
    const x = padding + index * (barWidth + barGap);
    const barHeight = ((height - padding * 2) * value) / 100;
    const y = height - padding - barHeight;
    context.fillStyle = color;
    context.fillRect(x, y, barWidth, barHeight);
    context.fillStyle = "#65716d";
    context.font = "12px Arial";
    context.fillText(`${value}${unit}`, x, Math.max(14, y - 8));
  });
}

function drawGrid(context, width, height, padding) {
  context.strokeStyle = "#dce5df";
  context.lineWidth = 1;
  for (let index = 0; index < 4; index += 1) {
    const y = padding + (index * (height - padding * 2)) / 3;
    context.beginPath();
    context.moveTo(padding, y);
    context.lineTo(width - padding, y);
    context.stroke();
  }
}

function drawEmptyState(context, width, height, values, message) {
  if (values.length) return;
  context.fillStyle = "#65716d";
  context.font = "14px Arial";
  context.textAlign = "center";
  context.fillText(message, width / 2, height / 2);
  context.textAlign = "start";
}

function drawDonutChart(canvas, values) {
  const { context, width, height } = setupCanvas(canvas);
  const total = values.reduce((sum, item) => sum + item.value, 0);
  if (!total) {
    drawEmptyState(context, width, height, [], "暂无营养数据");
    return;
  }
  const radius = Math.min(width, height) * 0.28;
  const centerX = width / 2;
  const centerY = height / 2;
  let start = -Math.PI / 2;
  values.forEach((item) => {
    const angle = (item.value / total) * Math.PI * 2;
    context.beginPath();
    context.moveTo(centerX, centerY);
    context.arc(centerX, centerY, radius, start, start + angle);
    context.closePath();
    context.fillStyle = item.color;
    context.fill();
    start += angle;
  });
  context.beginPath();
  context.arc(centerX, centerY, radius * 0.55, 0, Math.PI * 2);
  context.fillStyle = "#ffffff";
  context.fill();
  context.fillStyle = "#18211f";
  context.font = "700 14px Arial";
  context.textAlign = "center";
  context.fillText("宏量营养", centerX, centerY + 5);
  context.textAlign = "start";
  values.forEach((item, index) => {
    const x = 18;
    const y = 24 + index * 24;
    context.fillStyle = item.color;
    context.fillRect(x, y - 10, 12, 12);
    context.fillStyle = "#65716d";
    context.font = "13px Arial";
    context.fillText(`${item.label} ${item.value}g`, x + 20, y);
  });
}
