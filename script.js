
const $ = (selector) => document.querySelector(selector);

// Date
const today = new Date();

$("#date").textContent = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
});

// Tasks
let tasks = JSON.parse(localStorage.getItem("novaTasks")) || [];

function saveTasks() {
    localStorage.setItem("novaTasks", JSON.stringify(tasks));
}

function renderTasks() {
    const list = $("#taskList");
    list.innerHTML = "";

    if (tasks.length === 0) {
        list.innerHTML = '<div class="empty">No tasks yet. Add something to get started!</div>';
    }

    tasks.forEach(task => {
        const item = document.createElement("div");
        item.className = `task-item ${task.done ? "done" : ""}`;

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = task.done;
        checkbox.addEventListener("change", () => {
            task.done = checkbox.checked;
            saveTasks();
            renderTasks();
        });

        const name = document.createElement("span");
        name.className = "task-name";
        name.textContent = task.name;

        const remove = document.createElement("button");
        remove.className = "delete-btn";
        remove.textContent = "×";
        remove.setAttribute("aria-label", "Delete task");

        remove.addEventListener("click", () => {
            tasks = tasks.filter(t => t.id !== task.id);
            saveTasks();
            renderTasks();
        });

        item.append(checkbox, name, remove);
        list.appendChild(item);
    });

    updateStats();
}

$("#taskForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const input = $("#taskInput");
    const name = input.value.trim();

    if (!name) return;

    tasks.push({
        id: Date.now(),
        name,
        done: false
    });

    input.value = "";
    saveTasks();
    renderTasks();
});

function updateStats() {
    const completed = tasks.filter(task => task.done).length;
    const pending = tasks.length - completed;

    const progress = tasks.length
        ? Math.round((completed / tasks.length) * 100)
        : 0;

    $("#completedCount").textContent = completed;
    $("#pendingCount").textContent = pending;
    $("#progressText").textContent = progress + "%";
    $("#progressBar").style.width = progress + "%";
    $("#taskCount").textContent = `${tasks.length} TASKS`;
}

// Daily Goals
const goalChecks = document.querySelectorAll("[data-goal]");

goalChecks.forEach(check => {
    const key = `novaGoal_${today.toDateString()}`;
    check.checked = JSON.parse(localStorage.getItem(key) || "{}")[check.dataset.goal] || false;

    check.addEventListener("change", () => {
        const saved = JSON.parse(localStorage.getItem(key) || "{}");
        saved[check.dataset.goal] = check.checked;
        localStorage.setItem(key, JSON.stringify(saved));
        updateGoals();
    });
});

function updateGoals() {
    const completed = [...goalChecks].filter(goal => goal.checked).length;
    $("#goalProgress").textContent = `${completed} / ${goalChecks.length}`;
}

updateGoals();

// Focus Timer
let remaining = 25 * 60;
let interval = null;

function updateTimer() {
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;

    $("#timer").textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

$("#startTimer").addEventListener("click", () => {
    if (interval !== null) {
        clearInterval(interval);
        interval = null;
        $("#startTimer").textContent = "Resume";
        return;
    }

    if (remaining <= 0) return;

    $("#startTimer").textContent = "Pause";

    interval = setInterval(() => {
        remaining--;
        updateTimer();

        if (remaining <= 0) {
            clearInterval(interval);
            interval = null;
            $("#startTimer").textContent = "Completed!";
            alert("Focus session completed! Great work.");
        }
    }, 1000);
});

$("#resetTimer").addEventListener("click", () => {
    clearInterval(interval);
    interval = null;
    remaining = 25 * 60;
    $("#startTimer").textContent = "Start";
    updateTimer();
});

// Initial render
renderTasks();
updateTimer();
