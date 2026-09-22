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

// Добавление новой задачи в массив
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

// Переключение отметки выполнено по idшке задачи
function toggleTask(id) {
  tasks = tasks.map(function (task) {
    if (task.id === id) {
      return Object.assign({}, task, { completed: !task.completed });
    }
    return task;
  });
  render();
}

// Удаление задачи по id
function deleteTask(id) {
  tasks = tasks.filter(function (task) {
    return task.id !== id;
  });
  render();
}

// Возвращает подмассив задач, которые нужно показать при текущем фильтре.
function getVisibleTasks() {
  return tasks.filter(function (task) {
    if (currentFilter === "active") return !task.completed;
    if (currentFilter === "completed") return task.completed;
    return true; // 'all'
  });
}

// Создаёт один <li> для одной задачи
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

// Пересчитывает и выводит счётчики
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

// Главная функция отрисовки вызывается после изменения данных
function render() {
  // очищаем список и перерисовываем заново на основе массива tasks
  listEl.innerHTML = "";

  const visibleTasks = getVisibleTasks();

  visibleTasks.forEach(function (task) {
    listEl.appendChild(createTaskElement(task));
  });

  emptyMessageEl.classList.toggle("hidden", visibleTasks.length !== 0);

  updateCounters();
}

// submit формы обрабатывает и клик по кнопке,
formEl.addEventListener("submit", function (event) {
  event.preventDefault(); // чтобы страница не перезагружалась
  addTask(inputEl.value);
  inputEl.value = "";
  inputEl.focus();
});

// Убираем предупреждение, как только пользователь начал печатать
inputEl.addEventListener("input", function () {
  if (inputEl.value.trim() !== "") {
    warningEl.classList.add("hidden");
  }
});

// Переключение фильтра
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
