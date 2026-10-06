let tasks = [];
let nextId = 1;
let currentFilter = "all";

const formEl = document.getElementById("add-form");
const inputEl = document.getElementById("task-input");
const warningEl = document.getElementById("warning");
const listEl = document.getElementById("task-list");
const emptyMessageEl = document.getElementById("empty-message");
const activeCountEl = document.getElementById("active-count");
const completedCountEl = document.getElementById("completed-count");
const filterButtons = document.querySelectorAll(".filter-btn");

function addTask(rawText) {
  const text = rawText.trim();

  if (text === "") {
    warningEl.classList.remove("hidden");
    return;
  }

  warningEl.classList.add("hidden");

  tasks.push({
    id: nextId,
    text: text,
    completed: false,
  });
  nextId++;

  render();
}

function toggleTask(id) {
  tasks = tasks.map(function (task) {
    if (task.id === id) {
      return Object.assign({}, task, { completed: !task.completed });
    }
    return task;
  });
  render();
}

function deleteTask(id) {
  tasks = tasks.filter(function (task) {
    return task.id !== id;
  });
  render();
}

function getVisibleTasks() {
  return tasks.filter(function (task) {
    if (currentFilter === "active") return !task.completed;
    if (currentFilter === "completed") return task.completed;
    return true; // 'all'
  });
}

function createTaskElement(task) {
  const li = document.createElement("li");
  li.className = "task-item";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-checkbox";
  checkbox.checked = task.completed;
  checkbox.addEventListener("change", function () {
    toggleTask(task.id);
  });

  const span = document.createElement("span");
  span.className = "task-text" + (task.completed ? " completed" : "");
  span.textContent = task.text;

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "Удалить";
  deleteBtn.addEventListener("click", function () {
    deleteTask(task.id);
  });

  li.appendChild(checkbox);
  li.appendChild(span);
  li.appendChild(deleteBtn);

  return li;
}

function updateCounters() {
  const activeCount = tasks.filter(function (t) {
    return !t.completed;
  }).length;
  const completedCount = tasks.filter(function (t) {
    return t.completed;
  }).length;

  activeCountEl.textContent = activeCount;
  completedCountEl.textContent = completedCount;
}
function render() {
  listEl.innerHTML = "";

  const visibleTasks = getVisibleTasks();

  visibleTasks.forEach(function (task) {
    listEl.appendChild(createTaskElement(task));
  });

  emptyMessageEl.classList.toggle("hidden", visibleTasks.length !== 0);

  updateCounters();
}

formEl.addEventListener("submit", function (event) {
  event.preventDefault();
  addTask(inputEl.value);
  inputEl.value = "";
  inputEl.focus();
});

inputEl.addEventListener("input", function () {
  if (inputEl.value.trim() !== "") {
    warningEl.classList.add("hidden");
  }
});

filterButtons.forEach(function (btn) {
  btn.addEventListener("click", function () {
    currentFilter = btn.dataset.filter;

    filterButtons.forEach(function (b) {
      b.classList.remove("active");
    });
    btn.classList.add("active");

    render();
  });
});

render();
