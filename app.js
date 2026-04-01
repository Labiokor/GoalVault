
const user = localStorage.getItem('hubUser') || sessionStorage.getItem('hubUser');
if (!user) {
    window.location.href = 'login.html';
}
document.getElementById('usernameDisplay').textContent = user;

const closeBtn = document.querySelector(".close-btn");
const walletPage = document.getElementById("walletPage");
const accountHome = document.getElementById("accountHome");
const openWalletBtn = document.getElementById("openWalletBtn");
// 1.Navigation Logic
const dashboardBtn = document.getElementById("dashboardBtn");
const plannerBtn = document.getElementById("plannerBtn");

const dashboardSection = document.getElementById("dashboardSection");
const plannerSection = document.getElementById("plannerSection");

// 2. Wallet Logic
openWalletBtn.addEventListener("click", () => {
    accountHome.style.display = "none";
    walletPage.style.display = "flex";
});    
closeBtn.onclick = function() {
  accountHome.style.display = "flex";
  walletPage.style.display = "none";
};
//3.task manager logic
const tasklist = document.getElementById("tasklist");
const addTaskBtn = document.getElementById("addTaskBtn");
const taskinput = document.getElementById("taskinput");

let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
function getCountdownText(deadline) {
  if (!deadline) return "";
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(deadline);
  const diff = Math.round((due - now) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `Overdue by ${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"}`;
  if (diff === 0) return "Due today!";
  return `${diff} day${diff === 1 ? "" : "s"} left`;
}
// Load saved tasks
let activeFilter = "all";
function loadTasks(){
  tasklist.innerHTML = "";
  const filtered = activeFilter === "all" ? tasks : tasks.filter(t => t.category === activeFilter);
  filtered.forEach((task, index) => {
  const realIndex = tasks.indexOf(task);
  const li = document.createElement("li");
const isOverdue = task.deadline && new Date(task.deadline) < new Date().setHours(0,0,0,0);
if (isOverdue) li.classList.add("overdue");
li.classList.add(task.priority);
const countdown = getCountdownText(task.deadline);
const countdownColor = countdown.startsWith("Overdue") ? "#e74c3c" :
                       countdown === "Due today!" ? "#e67e22" : "#27ae60";
li.innerHTML = `
<span class="task-text">${task.text}</span>
<span class="task-category-badge ${task.category || "general"}">${task.category || "general"}</span>
${countdown ? `<span class="task-countdown" style="font-size:11px;color:${countdownColor};margin-left:8px;">${countdown}</span>` : ""}
<span class="task-delete" data-index="${index}" style="cursor:pointer;color:#aaa;margin-left:8px;font-size:12px;">✕</span>
`;
li.querySelector(".task-delete").addEventListener("click", (e) => {
e.stopPropagation();
 tasks.splice(index,1);
 saveTasks();
 checkDailyCompletion();
 });
 tasklist.appendChild(li);
    });
document.querySelectorAll(".filter-btn").forEach(btn => {
btn.addEventListener("click", function() {
document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
this.classList.add("active");
activeFilter = this.getAttribute("data-filter");
loadTasks();
 });
});
}
// Save tasks
function saveTasks(){
localStorage.setItem("tasks",JSON.stringify(tasks));
loadTasks();
updateDashboard(); 
}
// Add new task
addTaskBtn.addEventListener("click",()=>{
const text = taskinput.value.trim();
const deadline = document.getElementById("taskDeadline").value;
const priority=document.getElementById("prioritySelect").value;
const category = document.getElementById("categorySelect").value;
if(text === "") return;
tasks.push({text,priority,deadline,category});
taskinput.value = "";
document.getElementById("taskDeadline").value = "";
saveTasks();
});
//the enter key
taskinput.addEventListener("keypress",(e)=>{
if(e.key === "Enter") addTaskBtn.click();
});
function checkDeadlineAlerts() {
const now = new Date();
now.setHours(0, 0, 0, 0);
tasks.forEach(task => {
if (!task.deadline || task.alerted) return;
const due = new Date(task.deadline);
if (due <= now) {
alert(`🔔 "${task.text}" is due today or overdue!`);
task.alerted = true;
saveTasks();
}
});
}
loadTasks();
checkDeadlineAlerts();
setInterval(checkDeadlineAlerts, 60000);
//4. Streak logic with daily limit
let streak = JSON.parse(localStorage.getItem("streak")) || 0;
let lastStreakDate = localStorage.getItem("lastStreakDate"); // format: "YYYY-MM-DD"

const streakCount = document.querySelector("#streakMenu .streak-count");
const streakIcon = document.querySelector("#streakMenu .streak-icon");
const streakTooltip = document.querySelector("#streakMenu .streak-tooltip");
// Get today's date string
function getTodayString() {
return new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
}
function updateStreakDisplay() {
streakCount.textContent = streak;
streakTooltip.textContent = `Current streak: ${streak} day${streak === 1 ? "" : "s"}`;
localStorage.setItem("streak", streak);
}
function pulseStreakIcon() {
streakIcon.classList.add("pulse");
setTimeout(() => streakIcon.classList.remove("pulse"), 500);
}
// Increase streak if not already increased today
function increaseStreak() {
const today = getTodayString();
if (lastStreakDate === today) return; // already increased today
streak++;
lastStreakDate = today;
localStorage.setItem("lastStreakDate", lastStreakDate);
updateStreakDisplay();
pulseStreakIcon();
}
// Check if all tasks and habits are completed
function checkDailyCompletion() {
 const allTasksDone = tasks.length === 0;
 const allHabitsDone = [...document.querySelectorAll('.habit-check')].every(box => box.checked);
if (allTasksDone && allHabitsDone)
    increaseStreak();
}
// Initialize display
updateStreakDisplay();
 
// 5. Progress Bar Logic
const checkboxes = document.querySelectorAll('.card input[type="checkbox"]');
const progressBar = document.querySelector('.progress-bar');

checkboxes.forEach(box => {
 box.addEventListener('change', () => {
 const total = checkboxes.length;
 const checked = document.querySelectorAll('.card input[type="checkbox"]:checked').length;
const percentage = Math.round((checked / total) * 100);
        
if (progressBar) {
 progressBar.style.width = percentage + "%";
 progressBar.innerText = percentage + "%";
}
});
});
//6.notes logic
const addNoteBtn = document.getElementById("addNoteBtn");
const noteInput = document.getElementById("noteInput");
const notesList = document.getElementById("notesList");
let notes = JSON.parse(localStorage.getItem("notes")) || [];

function loadNotes() {
notesList.innerHTML = "";
notes.forEach((note, index) => {
const li = document.createElement("li");
li.textContent = note;
const del = document.createElement("span");
del.textContent = " X";
del.style.cssText = "cursor:pointer;color:#aaa;margin-left:8px;font-size:12px";
del.addEventListener("click", () => {
notes.splice(index, 1);
localStorage.setItem("notes", JSON.stringify(notes));
loadNotes();
});
li.appendChild(del);
notesList.appendChild(li);
});
}
addNoteBtn.addEventListener("click", ()=>{
const noteText = noteInput.value.trim();
if(noteText === "") return;
notes.push(noteText);
localStorage.setItem("notes",JSON.stringify(notes));
noteInput.value="";
loadNotes();
updateDashboard(); 
});
loadNotes();

//7.habits
const habitInput = document.getElementById("habitInput");
const addHabitBtn = document.getElementById("addHabitBtn");
const habitContainer = document.getElementById("habitContainer");
const habitScore = document.getElementById("habitScore");

let habits = JSON.parse(localStorage.getItem("habits")) || [];

function loadHabits(){
habitContainer.innerHTML = "";
habits.forEach((habit, index) => {
const habitItem = document.createElement("div");
habitItem.classList.add("habit-item");
habitItem.innerHTML = `
 <span>${habit.text}</span>
 <input type="checkbox" class="habit-check" ${habit.done ? "checked" : ""}>
 `;
const checkbox = habitItem.querySelector(".habit-check");
checkbox.addEventListener("change", () => {
 habits[index].done = checkbox.checked;
saveHabits();
updateScore();
checkDailyCompletion();
});
 habitContainer.appendChild(habitItem);
 });
 updateScore();
}
// to add a habit //
addHabitBtn.addEventListener("click", () => {
const text = habitInput.value.trim();
if(text === "") return;
habits.push({text:text, done:false});
habitInput.value = "";
saveHabits();
loadHabits();
});
// to save habits 
function saveHabits(){
    localStorage.setItem("habits", JSON.stringify(habits));
    updateDashboard(); 
}
function updateScore(){
const bar = document.querySelector(".habit-stats-bar");
if(habits.length === 0){
habitScore.textContent = "0%";
if (bar) bar.style.width = "0%";
return;
}
const completed = habits.filter(h => h.done).length;
const percent = Math.round((completed / habits.length) * 100);
habitScore.textContent = percent + "%";
//to connect with the streak
if (bar) bar.style.width = percent + "%";
if(percent === 100) increaseStreak();
}
loadHabits();
// 8. Reminder Logic
function setReminder() {
  const input = document.querySelector(".reminder-input").value;
  if (!input) return alert("Please pick a date and time.");
  const reminderTime = new Date(input).getTime();
  const now = new Date().getTime();
  const delay = reminderTime - now;
  if (delay <= 0) return alert("Please choose a future time.");
  const li = document.createElement("li");
  li.textContent = "⏰ " + new Date(input).toLocaleString();
  document.getElementById("reminderList").appendChild(li);
  setTimeout(() => alert("🔔 Reminder: Time's up!"), delay);
}

const links = document.querySelectorAll(".nav-item a");
const sections = document.querySelectorAll(".section");

links.forEach(link => {
link.addEventListener("click",function(e) {
e.preventDefault();
document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
this.parentElement.classList.add('active');
const targetId = this.getAttribute("data-target");
sections.forEach(section => 
    section.style.display = "none");
const targetSection = document.getElementById(targetId);
    if (targetSection) 
        targetSection.style.display = "block";
});
});
// Username
const saveUsernameBtn = document.getElementById("saveUsernameBtn");
const usernameInput = document.getElementById("usernameInput");
const usernameDisplay = document.getElementById("usernameDisplay");

const savedName = localStorage.getItem("username");
if (savedName) {
  usernameDisplay.textContent = savedName;
  usernameInput.value = savedName;
}
saveUsernameBtn.addEventListener("click", () => {
  const name = usernameInput.value.trim();
  if (name === "") return;
  localStorage.setItem("username", name);
  usernameDisplay.textContent = name;
});
// Dark mode
const darkModeBtn = document.getElementById("darkModeBtn");
if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark");
  darkModeBtn.textContent = "light mode";
}
darkModeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("darkMode", isDark);
  darkModeBtn.textContent = isDark ? "light mode" : "dark mode";
});
// Delete habits (already handled in loadHabits — update it)
function loadHabits() {
  habitContainer.innerHTML = "";
  habits.forEach((habit, index) => {
    const habitItem = document.createElement("div");
    habitItem.classList.add("habit-item");
    habitItem.innerHTML = `
      <span>${habit.text}</span>
      <input type="checkbox" class="habit-check" ${habit.done ? "checked" : ""}>
      <span class="habit-delete" style="cursor:pointer;color:#aaa;margin-left:8px;font-size:12px;">✕</span>
    `;
    habitItem.querySelector(".habit-check").addEventListener("change", (e) => {
      habits[index].done = e.target.checked;
      saveHabits();
      updateScore();
      checkDailyCompletion();
    });
    habitItem.querySelector(".habit-delete").addEventListener("click", () => {
      habits.splice(index, 1);
      saveHabits();
      loadHabits();
    });
    habitContainer.appendChild(habitItem);
  });
  updateScore();
}
// Dashboard updater
function updateDashboard() {
  const dashTasks = document.getElementById("dashTasks");
  const dashHabits = document.getElementById("dashHabits");
  const dashStreak = document.getElementById("dashStreak");
  const dashNotes = document.getElementById("dashNotes");
  if (dashTasks) dashTasks.textContent = `${tasks.length} remaining`;
  if (dashHabits) {
    const percent = habits.length === 0 ? 0 : Math.round((habits.filter(h => h.done).length / habits.length) * 100);
    dashHabits.textContent = `${percent}% done today`;
  }
  if (dashStreak) dashStreak.textContent = `${streak} days`;
  if (dashNotes) dashNotes.textContent = `${notes.length} saved`;
}
updateDashboard();