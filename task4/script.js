const CODE_LENGTH = 4;

const state = {
  secret: "",
  history: [],
  isWon: false,
  message: { text: "", type: "" },
};

const form = document.getElementById("guess-form");
const guessInput = document.getElementById("guess-input");
const checkBtn = document.getElementById("check-btn");
const newGameBtn = document.getElementById("new-game-btn");
const messageEl = document.getElementById("message");
const attemptsCountEl = document.getElementById("attempts-count");
const historyEl = document.getElementById("history");

function generateSecret() {
  const digits = "0123456789".split("");

  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }

  return digits.slice(0, CODE_LENGTH).join("");
}

function validateGuess(value) {
  if (value === "") {
    return { valid: false, error: `Введите ${CODE_LENGTH} цифры.` };
  }

  if (!/^[0-9]+$/.test(value)) {
    return {
      valid: false,
      error: "Допустимы только цифры — без букв, пробелов и символов.",
    };
  }

  if (value.length !== CODE_LENGTH) {
    return {
      valid: false,
      error: `Нужно ввести ровно ${CODE_LENGTH} цифры, а введено: ${value.length}.`,
    };
  }

  if (new Set(value).size !== CODE_LENGTH) {
    return { valid: false, error: "Все цифры должны быть разными." };
  }

  return { valid: true, error: "" };
}

function countBullsAndCows(secret, guess) {
  let bulls = 0;
  let cows = 0;

  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guess[i] === secret[i]) {
      bulls++;
    } else if (secret.includes(guess[i])) {
      cows++;
    }
  }

  return { bulls, cows };
}

function pluralize(n, forms) {
  const mod100 = n % 100;
  const mod10 = n % 10;

  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

function formatResult(bulls, cows) {
  const bullsText = `${bulls} ${pluralize(bulls, ["бык", "быка", "быков"])}`;
  const cowsText = `${cows} ${pluralize(cows, ["корова", "коровы", "коров"])}`;
  return `${bullsText}, ${cowsText}`;
}

function createHistoryItem(attempt, index) {
  const li = document.createElement("li");
  li.className = "history__item";

  const number = document.createElement("span");
  number.className = "history__number";
  number.textContent = index + 1;

  const line = document.createElement("span");
  line.className = "history__line";
  line.textContent = `${attempt.guess} → ${formatResult(attempt.bulls, attempt.cows)}`;

  li.append(number, line);
  return li;
}

function render() {
  attemptsCountEl.textContent = state.history.length;

  const items = state.history.map(createHistoryItem).reverse();
  historyEl.replaceChildren(...items);

  messageEl.textContent = state.message.text;
  messageEl.className = state.message.type
    ? `message message--${state.message.type}`
    : "message";

  guessInput.disabled = state.isWon;
  checkBtn.disabled = state.isWon;
}

function startNewGame() {
  state.secret = generateSecret();
  state.history = [];
  state.isWon = false;
  state.message = { text: "", type: "" };

  guessInput.value = "";
  render();
  guessInput.focus();

  console.log("Загаданное число (для проверки):", state.secret);
}

function handleGuess(event) {
  event.preventDefault();

  if (state.isWon) return;

  const value = guessInput.value.trim();
  const validation = validateGuess(value);

  if (!validation.valid) {
    state.message = { text: validation.error, type: "error" };
    render();
    guessInput.focus();
    guessInput.select();
    return;
  }

  const { bulls, cows } = countBullsAndCows(state.secret, value);
  state.history.push({ guess: value, bulls, cows });

  if (bulls === CODE_LENGTH) {
    const attempts = state.history.length;
    state.isWon = true;
    state.message = {
      text: `Победа! Угадано за ${attempts} ${pluralize(attempts, ["попытку", "попытки", "попыток"])}`,
      type: "win",
    };
  } else {
    state.message = { text: "", type: "" };
  }

  guessInput.value = "";
  render();

  if (!state.isWon) {
    guessInput.focus();
  }
}

form.addEventListener("submit", handleGuess);
newGameBtn.addEventListener("click", startNewGame);

startNewGame();
