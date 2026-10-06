"use strict";

const PAD_COUNT = 4;
const SHOW_MS = 500;
const GAP_MS = 250;
const PLAYER_FLASH_MS = 200;
const FIRST_DELAY_MS = 500;
const ROUND_DELAY_MS = 900;
const PAD_FREQUENCIES = [262, 330, 392, 523];

const state = {
  sequence: [],
  playerInput: [],
  level: 0,
  isActive: false,
  isShowing: false,
  isGameOver: false,
  message: "Нажмите «Старт», чтобы начать",
  runId: 0,
};

const boardEl = document.getElementById("board");
const hubEl = document.getElementById("hub");
const levelEl = document.getElementById("level");
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("start");
const soundEl = document.getElementById("sound");
const padEls = Array.from(document.querySelectorAll(".pad"));

const pendingTimers = new Map();

function wait(ms) {
  return new Promise((resolve) => {
    const id = setTimeout(() => {
      pendingTimers.delete(id);
      resolve(true);
    }, ms);
    pendingTimers.set(id, resolve);
  });
}

function cancelAllTimers() {
  pendingTimers.forEach((resolve, id) => {
    clearTimeout(id);
    resolve(false);
  });
  pendingTimers.clear();
}

let audioCtx = null;

function getAudioContext() {
  if (!soundEl.checked) return null;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  } catch (err) {
    return null;
  }
}

function playTone(frequency, durationMs, type = "sine") {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const end = now + durationMs / 1000;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(end + 0.05);
}

function getRandomPad() {
  return Math.floor(Math.random() * PAD_COUNT);
}

function render() {
  const isLocked = !state.isActive || state.isShowing;

  levelEl.textContent = state.level;
  statusEl.textContent = state.message;

  boardEl.classList.toggle("is-locked", isLocked);
  hubEl.classList.toggle("is-over", state.isGameOver);
  statusEl.classList.toggle("is-over", state.isGameOver);
  padEls.forEach((pad) => pad.setAttribute("aria-disabled", String(isLocked)));
}

function clearActivePads() {
  padEls.forEach((pad) => pad.classList.remove("active"));
}

async function flashPad(index, ms) {
  padEls[index].classList.add("active");
  playTone(PAD_FREQUENCIES[index], ms);
  const completed = await wait(ms);
  padEls[index].classList.remove("active");
  return completed;
}

async function playSequence(runId) {
  for (const index of state.sequence) {
    if (!(await flashPad(index, SHOW_MS))) return;
    if (!(await wait(GAP_MS))) return;
  }

  if (runId !== state.runId) return;

  state.isShowing = false;
  state.playerInput = [];
  state.message = `Ваш ход: 0 из ${state.sequence.length}`;
  render();
}

async function nextRound(delayMs) {
  const runId = state.runId;

  state.isShowing = true;
  state.playerInput = [];
  render();

  if (!(await wait(delayMs))) return;
  if (runId !== state.runId) return;

  state.sequence.push(getRandomPad());
  state.level = state.sequence.length;
  state.message = "Запоминайте последовательность";
  render();

  await playSequence(runId);
}

function isCorrectStep(index) {
  return state.sequence[state.playerInput.length] === index;
}

function handlePadClick(index) {
  if (!state.isActive || state.isShowing) return;

  flashPad(index, PLAYER_FLASH_MS);

  if (!isCorrectStep(index)) {
    endGame();
    return;
  }

  state.playerInput.push(index);

  if (state.playerInput.length === state.sequence.length) {
    state.message = "Верно! Следующий уровень…";
    nextRound(ROUND_DELAY_MS);
  } else {
    state.message = `Ваш ход: ${state.playerInput.length} из ${state.sequence.length}`;
    render();
  }
}

function startGame() {
  cancelAllTimers();
  state.runId += 1;
  clearActivePads();

  state.sequence = [];
  state.playerInput = [];
  state.level = 0;
  state.isActive = true;
  state.isShowing = true;
  state.isGameOver = false;
  state.message = "Приготовьтесь…";

  getAudioContext();
  nextRound(FIRST_DELAY_MS);
}

function endGame() {
  state.isActive = false;
  state.isShowing = false;
  state.isGameOver = true;
  state.message = `Ошибка! Вы дошли до уровня ${state.level}`;
  playTone(110, 500, "sawtooth");
  render();
}

padEls.forEach((pad) => {
  pad.addEventListener("click", () => handlePadClick(Number(pad.dataset.pad)));
});

startBtn.addEventListener("click", startGame);

render();