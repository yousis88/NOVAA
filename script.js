(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const STORAGE = {
    tasks: "novaa_v2_tasks",
    goals: "novaa_v2_goals_",
    sessions: "novaa_v2_sessions_"
  };

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  $("#date").textContent = today.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric"
  });

  function readJSON(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      showToast("Could not save data. Browser storage may be full.");
    }
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timeout);
    showToast.timeout = setTimeout(() => toast.classList.remove("show"), 2400);
  }

  // Tasks
  let tasks = readJSON(STORAGE.tasks, readJSON("novaTasks", []));
  let currentFilter = "all";
  let searchTerm = "";

  function saveTasks() {
    save(STORAGE.tasks, tasks);
  }

  function renderTasks() {
    const list = $("#taskList");
    list.replaceChildren();

    const visible = tasks.filter(task => {
      const matchesFilter =
        currentFilter === "all" ||
        (currentFilter === "active" && !task.done) ||
        (currentFilter === "completed" && task.done);
      return matchesFilter && task.name.toLowerCase().includes(searchTerm);
    });

    if (!visible.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = tasks.length
        ? "No tasks match this view."
        : "No tasks yet. Add one above to get started.";
      list.append(empty);
    }

    visible.forEach(task => {
      const item = document.createElement("div");
      item.className = `task-item${task.done ? " done" : ""}`;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "task-check";
      checkbox.checked = Boolean(task.done);
      checkbox.setAttribute("aria-label", `Mark ${task.name} as ${task.done ? "active" : "completed"}`);
      checkbox.addEventListener("change", () => {
        task.done = checkbox.checked;
        saveTasks();
        renderTasks();
      });

      const name = document.createElement("span");
      name.className = "task-name";
      name.textContent = task.name;

      const priority = document.createElement("span");
      priority.className = `priority ${task.priority || "normal"}`;
      priority.textContent = task.priority || "normal";

      const remove = document.createElement("button");
      remove.className = "delete-btn";
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Delete ${task.name}`);
      remove.addEventListener("click", () => {
        tasks = tasks.filter(item => item.id !== task.id);
        saveTasks();
        renderTasks();
        showToast("Task deleted.");
      });

      item.append(checkbox, name, priority, remove);
      list.append(item);
    });

    updateStats();
    $("#taskSummary").textContent = `${tasks.filter(t => !t.done).length} tasks left to do`;
    $("#taskCount").textContent = `${tasks.length} ${tasks.length === 1 ? "TASK" : "TASKS"}`;
  }

  $("#taskForm").addEventListener("submit", event => {
    event.preventDefault();
    const input = $("#taskInput");
    const name = input.value.trim();
    if (!name) return;

    tasks.unshift({
      id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())),
      name,
      priority: $("#taskPriority").value,
      done: false,
      createdAt: Date.now()
    });
    input.value = "";
    saveTasks();
    renderTasks();
    input.focus();
    showToast("Task added.");
  });

  $$(".filter-btn").forEach(button => {
    button.addEventListener("click", () => {
      currentFilter = button.dataset.filter;
      $$(".filter-btn").forEach(item => item.classList.toggle("active", item === button));
      renderTasks();
    });
  });

  $("#taskSearch").addEventListener("input", event => {
    searchTerm = event.target.value.trim().toLowerCase();
    renderTasks();
  });

  $("#clearCompleted").addEventListener("click", () => {
    const before = tasks.length;
    tasks = tasks.filter(task => !task.done);
    saveTasks();
    renderTasks();
    showToast(before === tasks.length ? "No completed tasks to clear." : "Completed tasks cleared.");
  });

  function updateStats() {
    const completed = tasks.filter(task => task.done).length;
    const pending = tasks.length - completed;
    const rate = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
    $("#completedCount").textContent = completed;
    $("#pendingCount").textContent = pending;
    $("#totalCount").textContent = tasks.length;
    $("#completionRate").textContent = `${rate}%`;
  }

  // Daily goals reset automatically each calendar day.
  const goalKey = STORAGE.goals + todayKey;
  const goalChecks = $$("[data-goal]");
  const savedGoals = readJSON(goalKey, readJSON(`novaGoal_${today.toDateString()}`, {}));
  goalChecks.forEach(check => {
    check.checked = Boolean(savedGoals[check.dataset.goal]);
    check.addEventListener("change", () => {
      const state = Object.fromEntries(goalChecks.map(item => [item.dataset.goal, item.checked]));
      save(goalKey, state);
      updateGoals();
    });
  });

  function updateGoals() {
    const completed = goalChecks.filter(goal => goal.checked).length;
    const total = goalChecks.length;
    $("#goalProgress").textContent = `${completed} / ${total}`;
    $("#goalProgressBar").style.width = `${total ? completed / total * 100 : 0}%`;
  }

  // Focus timer
  let selectedMinutes = 25;
  let remaining = selectedMinutes * 60;
  let interval = null;
  let sessions = readJSON(STORAGE.sessions + todayKey, 0);

  $("#sessionCount").textContent = sessions;

  function updateTimer() {
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    $("#timer").textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    const progress = 1 - remaining / (selectedMinutes * 60);
    $("#timerRing").style.background = `conic-gradient(var(--purple) ${progress * 360}deg, #4b3b73 0deg)`;
  }

  function stopTimer() {
    if (interval !== null) clearInterval(interval);
    interval = null;
  }

  function completeSession() {
    stopTimer();
    sessions += 1;
    save(STORAGE.sessions + todayKey, sessions);
    $("#sessionCount").textContent = sessions;
    $("#startTimer").textContent = "Start again";
    $("#timerHint").textContent = "Session complete. Take a short break.";
    $("#timerMode").textContent = "COMPLETED";
    showToast("Focus session complete. Well done!");
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("NOVAA", { body: "Your focus session is complete." });
    }
  }

  $("#startTimer").addEventListener("click", () => {
    if (interval !== null) {
      stopTimer();
      $("#startTimer").textContent = "Resume";
      $("#timerHint").textContent = "Paused. Pick up whenever you're ready.";
      return;
    }
    if (remaining <= 0) {
      remaining = selectedMinutes * 60;
      updateTimer();
    }
    $("#startTimer").textContent = "Pause";
    $("#timerMode").textContent = "FOCUS SESSION";
    $("#timerHint").textContent = "Stay with one task. You've got this.";
    interval = setInterval(() => {
      remaining -= 1;
      updateTimer();
      if (remaining <= 0) completeSession();
    }, 1000);
  });

  $("#resetTimer").addEventListener("click", () => {
    stopTimer();
    remaining = selectedMinutes * 60;
    $("#startTimer").textContent = "Start focus";
    $("#timerMode").textContent = "FOCUS SESSION";
    $("#timerHint").textContent = "Timer reset. Ready when you are.";
    updateTimer();
  });

  $$(".preset-btn").forEach(button => {
    button.addEventListener("click", () => {
      stopTimer();
      selectedMinutes = Number(button.dataset.minutes);
      remaining = selectedMinutes * 60;
      $$(".preset-btn").forEach(item => item.classList.toggle("active", item === button));
      $("#startTimer").textContent = "Start focus";
      $("#timerMode").textContent = "FOCUS SESSION";
      $("#timerHint").textContent = "Choose one task and give it your attention.";
      updateTimer();
    });
  });

  // Highlight the navigation section currently selected.
  $$(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
      $$(".nav-link").forEach(item => item.classList.toggle("active", item === link));
    });
  });

  renderTasks();
  updateGoals();
  updateTimer();
})();
