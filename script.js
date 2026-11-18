(() => {
  "use strict";
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const page = document.body.dataset.page || "overview";
  const KEY = {
    tasks: "novaa_v2_tasks",
    goalsPrefix: "novaa_v2_goals_",
    sessionsPrefix: "novaa_v2_sessions_",
    theme: "novaa_theme"
  };
  const today = new Date();
  const todayKey = today.toISOString().slice(0,10);
  const oldGoalKey = `novaGoal_${today.toDateString()}`;

  function read(key, fallback) {
    try { const raw=localStorage.getItem(key); return raw===null ? fallback : JSON.parse(raw); }
    catch { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { toast("Unable to save. Browser storage may be full."); }
  }
  function toast(message) {
    const el=$("#toast"); if(!el) return;
    el.textContent=message; el.classList.add("show");
    clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove("show"),2400);
  }
  function tasksData() {
    // Keep compatibility with the previous NOVAA version's saved task key.
    let data=read(KEY.tasks, null);
    if(data===null) { data=read("novaTasks", []); write(KEY.tasks,data); }
    return Array.isArray(data)?data:[];
  }
  let tasks=tasksData();
  const saveTasks=()=>write(KEY.tasks,tasks);
  function goalsData() {
    let data=read(KEY.goalsPrefix+todayKey,null);
    if(data===null) data=read(oldGoalKey,{});
    return data && typeof data==="object" ? data : {};
  }
  let goals=goalsData();
  const saveGoals=()=>write(KEY.goalsPrefix+todayKey,goals);
  let sessions=read(KEY.sessionsPrefix+todayKey,0);
  if(!Number.isFinite(sessions)) sessions=0;

  // Theme setting is shared by every page.
  const theme=localStorage.getItem(KEY.theme)||"dark";
  if(theme==="light") document.documentElement.classList.add("light-theme");
  const themeToggle=$("#themeToggle");
  if(themeToggle) {
    themeToggle.checked=theme==="light";
    themeToggle.addEventListener("change",()=>{
      const next=themeToggle.checked?"light":"dark";
      localStorage.setItem(KEY.theme,next);
      document.documentElement.classList.toggle("light-theme",next==="light");
      toast(`${next==="light"?"Light":"Dark"} appearance enabled.`);
    });
  }

  // Smooth page changes: animate out before following the normal link.
  $$("a[href$='.html']").forEach(link=>{
    const target=new URL(link.href,location.href);
    if(target.origin!==location.origin) return;
    link.addEventListener("click",event=>{
      if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0) return;
      if(target.pathname===location.pathname) return;
      event.preventDefault();
      const content=$(".page-content");
      if(content) content.classList.add("leaving");
      setTimeout(()=>location.href=link.href,150);
    });
  });
  $$("[data-nav]").forEach(link=>link.classList.toggle("active",link.dataset.nav===page));

  function updateStats() {
    const completed=tasks.filter(t=>t.done).length;
    const pending=tasks.length-completed;
    const rate=tasks.length?Math.round(completed/tasks.length*100):0;
    if($("#completedCount")) $("#completedCount").textContent=completed;
    if($("#pendingCount")) $("#pendingCount").textContent=pending;
    if($("#totalCount")) $("#totalCount").textContent=tasks.length;
    if($("#completionRate")) $("#completionRate").textContent=rate+"%";
    if($("#sessionCount")) $("#sessionCount").textContent=sessions;
    if($("#focusSessionsLabel")) $("#focusSessionsLabel").textContent=`${sessions} ${sessions===1?"session":"sessions"} today`;
    if($("#taskPageCount")) $("#taskPageCount").textContent=`${tasks.length} ${tasks.length===1?"task":"tasks"}`;
  }
  function renderTaskItem(task, compact=false) {
    const item=document.createElement("div");
    item.className=`task-item${task.done?" done":""}`;
    const check=document.createElement("input");
    check.type="checkbox"; check.className="task-check"; check.checked=!!task.done;
    check.setAttribute("aria-label",`Mark ${task.name} as ${task.done?"active":"completed"}`);
    check.addEventListener("change",()=>{task.done=check.checked;saveTasks();renderTasksPage();renderDashboardTasks();});
    const name=document.createElement("span");name.className="task-name";name.textContent=task.name;
    item.append(check,name);
    if(!compact){
      const priority=document.createElement("span");priority.className=`priority ${task.priority||"normal"}`;priority.textContent=task.priority||"normal";
      const del=document.createElement("button");del.className="delete-btn";del.type="button";del.textContent="×";del.setAttribute("aria-label",`Delete ${task.name}`);
      del.addEventListener("click",()=>{tasks=tasks.filter(t=>t.id!==task.id);saveTasks();renderTasksPage();renderDashboardTasks();toast("Task deleted.");});
      item.append(priority,del);
    }
    return item;
  }
  let activeFilter="all", searchTerm="";
  function renderTasksPage() {
    const list=$("#taskList"); if(!list)return;
    list.replaceChildren();
    const visible=tasks.filter(t=>(activeFilter==="all"||(activeFilter==="active"&&!t.done)||(activeFilter==="completed"&&t.done))&&t.name.toLowerCase().includes(searchTerm));
    if(!visible.length){const empty=document.createElement("div");empty.className="empty-state";empty.textContent=tasks.length?"No tasks match this view.":"No tasks yet. Add one above to get started.";list.append(empty);}
    visible.forEach(t=>list.append(renderTaskItem(t)));
    if($("#taskSummary"))$("#taskSummary").textContent=`${tasks.filter(t=>!t.done).length} tasks left to do`;
    if($("#taskCount"))$("#taskCount").textContent=`${tasks.length} ${tasks.length===1?"TASK":"TASKS"}`;
    updateStats();
  }
  function renderDashboardTasks() {
    const list=$("#dashboardTasks");if(!list)return;
    list.replaceChildren();
    const next=tasks.filter(t=>!t.done).slice(0,5);
    if(!next.length){const empty=document.createElement("div");empty.className="empty-state";empty.textContent="No active tasks. Add your first task.";list.append(empty);}
    next.forEach(t=>list.append(renderTaskItem(t,true)));
    updateStats();
  }
  if($("#taskForm")) {
    $("#taskForm").addEventListener("submit",e=>{
      e.preventDefault();const input=$("#taskInput"),name=input.value.trim();if(!name)return;
      tasks.unshift({id:globalThis.crypto?.randomUUID?.()||String(Date.now()+Math.random()),name,priority:$("#taskPriority").value,done:false,createdAt:Date.now()});
      input.value="";saveTasks();renderTasksPage();renderDashboardTasks();input.focus();toast("Task added.");
    });
    $$(".filter-btn").forEach(btn=>btn.addEventListener("click",()=>{
      activeFilter=btn.dataset.filter;$$(".filter-btn").forEach(b=>b.classList.toggle("active",b===btn));renderTasksPage();
    }));
    $("#taskSearch").addEventListener("input",e=>{searchTerm=e.target.value.trim().toLowerCase();renderTasksPage();});
    $("#clearCompleted").addEventListener("click",()=>{
      const before=tasks.length;tasks=tasks.filter(t=>!t.done);saveTasks();renderTasksPage();renderDashboardTasks();
      toast(before===tasks.length?"No completed tasks to clear.":"Completed tasks cleared.");
    });
  }

  function updateGoals() {
    const checks=$$("[data-goal]");const done=checks.filter(c=>c.checked).length;
    const total=checks.length||4;
    if($("#goalProgress"))$("#goalProgress").textContent=`${done} / ${total}`;
    if($("#goalProgressBar"))$("#goalProgressBar").style.width=`${done/total*100}%`;
    if($("#goalSummary"))$("#goalSummary").textContent=done===total?"All goals complete. Great work!":`${done} of ${total} goals completed. Keep going at your own pace.`;
  }
  $$("[data-goal]").forEach(check=>{
    check.checked=!!goals[check.dataset.goal];
    check.addEventListener("change",()=>{goals[check.dataset.goal]=check.checked;saveGoals();updateGoals();});
  });

  // Focus timer. Session completion is stored by local calendar date.
  let selectedMinutes=25,remaining=1500,interval=null;
  function updateTimer(){
    const m=Math.floor(remaining/60),s=remaining%60;
    if($("#timer"))$("#timer").textContent=`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
    if($("#timerRing")){const progress=1-remaining/(selectedMinutes*60);$("#timerRing").style.background=`conic-gradient(var(--purple) ${progress*360}deg,#4b3b73 0deg)`;}
  }
  function stopTimer(){if(interval!==null)clearInterval(interval);interval=null;}
  function finishSession(){
    stopTimer();sessions+=1;write(KEY.sessionsPrefix+todayKey,sessions);updateStats();
    if($("#startTimer"))$("#startTimer").textContent="Start again";
    if($("#timerMode"))$("#timerMode").textContent="COMPLETED";
    if($("#timerHint"))$("#timerHint").textContent="Session complete. Take a short break.";
    toast("Focus session complete. Well done!");
    if("Notification"in window&&Notification.permission==="granted")new Notification("NOVAA",{body:"Your focus session is complete."});
  }
  if($("#startTimer")){
    $("#startTimer").addEventListener("click",()=>{
      if(interval!==null){stopTimer();$("#startTimer").textContent="Resume";$("#timerHint").textContent="Paused. Pick up whenever you're ready.";return;}
      if(remaining<=0){remaining=selectedMinutes*60;updateTimer();}
      $("#startTimer").textContent="Pause";$("#timerMode").textContent="FOCUS SESSION";$("#timerHint").textContent="Stay with one task. You've got this.";
      interval=setInterval(()=>{remaining=Math.max(0,remaining-1);updateTimer();if(remaining===0)finishSession();},1000);
    });
    $("#resetTimer").addEventListener("click",()=>{stopTimer();remaining=selectedMinutes*60;$("#startTimer").textContent="Start focus";$("#timerMode").textContent="FOCUS SESSION";$("#timerHint").textContent="Timer reset. Ready when you are.";updateTimer();});
    $$(".preset-btn").forEach(btn=>btn.addEventListener("click",()=>{
      stopTimer();selectedMinutes=Number(btn.dataset.minutes);remaining=selectedMinutes*60;
      $$(".preset-btn").forEach(b=>b.classList.toggle("active",b===btn));
      $("#startTimer").textContent="Start focus";$("#timerMode").textContent="FOCUS SESSION";$("#timerHint").textContent="Choose one task and give it your attention.";updateTimer();
    }));
  }

  // Settings: export a portable JSON backup and offer a deliberate reset.
  if($("#exportData"))$("#exportData").addEventListener("click",()=>{
    const backup={exportedAt:new Date().toISOString(),tasks,goals,sessions,theme:localStorage.getItem(KEY.theme)||"dark"};
    const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="novaa-backup.json";a.click();URL.revokeObjectURL(url);toast("Your backup is ready.");
  });
  if($("#resetData"))$("#resetData").addEventListener("click",()=>{
    const confirmed=window.confirm("This will delete your saved tasks, goals and focus-session counts from this browser. Continue?");
    if(!confirmed)return;
    Object.keys(localStorage).filter(k=>k.startsWith("novaa_v2_")||k==="novaTasks"||k.startsWith("novaGoal_")).forEach(k=>localStorage.removeItem(k));
    localStorage.removeItem(KEY.theme);toast("NOVAA data reset. Reloading...");
    setTimeout(()=>location.href="index.html",700);
  });

  // Date labels and page-specific initial render.
  const dateText=today.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});
  if($("#date"))$("#date").textContent=dateText;
  if($("#goalsDate"))$("#goalsDate").textContent=today.toLocaleDateString("en-US",{month:"long",day:"numeric"});
  renderTasksPage();renderDashboardTasks();updateGoals();updateTimer();updateStats();
})();
