const streakDisplay = document.querySelector(".streak-text strong");
const modal = document.getElementById("walletModal");
const walletBtn = document.getElementById("MyWalletBtn");
const closeBtn = document.querySelector(".close-btn");

// 1.Navigation Logic
const dashboardBtn = document.getElementById("dashboardBtn");
const plannerBtn = document.getElementById("plannerBtn");

const dashboardSection = document.getElementById("dashboardSection");
const plannerSection = document.getElementById("plannerSection");

// 2. Wallet Logic
walletBtn.onclick = function() {
modal.style.display = "block";
}
closeBtn.onclick = function() {
 modal.style.display = "none";
}
window.onclick = function(event) {
if (event.target == modal) {
    modal.style.display = "none";
}}
const openWalletBtn = document.getElementById("openWalletBtn");
const accountHome = document.getElementById("accountHome");

openWalletBtn.addEventListener("click", () => {
    accountHome.style.display = "none";
    walletPage.style.display = "flex";
});
//3.task manager logic
const tasklist = document.getElementById("tasklist");
const addTaskBtn = document.getElementById("addTaskBtn");
const taskinput = document.getElementById("taskinput");

let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
// Load saved tasks
function loadTasks(){
tasklist.innerHTML = "";

 tasks.forEach((task,index) => {
 const li = document.createElement("li");
 li.textContent = task;
li.dataset.index=index;

li.addEventListener("click",()=>{
 const i=li.dataset.index;
 tasks.splice(i,1);
 saveTasks();
 checkDailyCompletion();
 });
 tasklist.appendChild(li);
    });
}
// Save tasks
function saveTasks(){
localStorage.setItem("tasks",JSON.stringify(tasks));
loadTasks();
}
// Add new task
addTaskBtn.addEventListener("click",()=>{
const text = taskinput.value.trim();
if(text === "") return;
tasks.push(text);
taskinput.value = "";
 saveTasks();
});
//the enter key
taskinput.addEventListener("keypress",(e)=>{
if(e.key === "Enter"){
addTaskBtn.click();
}
});
loadTasks();

//4. Streak logic with daily limit
let streak = JSON.parse(localStorage.getItem("streak")) || 0;
let lastStreakDate = localStorage.getItem("lastStreakDate"); // format: "YYYY-MM-DD"

const streakCount = document.querySelector("#streakMenu .streak-count");
const streakIcon = document.querySelector("#streakMenu .streak-icon");
const streakTooltip = document.querySelector("#streakMenu .streak-tooltip");
// Get today's date string
function getTodayString() {
const today = new Date();
return today.toISOString().split("T")[0]; // "YYYY-MM-DD"
}
function updateStreakDisplay() {
streakCount.textContent = streak;
streakTooltip.textContent = `Current streak: ${streak} day${streak === 1 ? "" : "s"}`;
localStorage.setItem("streak", streak);
}
// Pulse animation
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

if (allTasksDone && allHabitsDone) {
    increaseStreak();
}
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

addNoteBtn.addEventListener("click", function(){

const noteText = noteInput.value.trim();

if(noteText === "") return;

const li = document.createElement("li");
li.textContent = noteText;

notesList.appendChild(li);
noteInput.value = "";
});

//habits
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
}
function updateScore(){
if(habits.length === 0){
habitScore.textContent = "0%";
 return;
 }
const completed = habits.filter(h => h.done).length;
const percent = Math.round((completed / habits.length) * 100);
habitScore.textContent = percent + "%";
//to connect with the streak
if(percent === 100){
streak++;
 localStorage.setItem("streak", streak);
 streakCount.textContent = streak;
}
}
streakCount.textContent = streak;
loadHabits();

const links = document.querySelectorAll(".nav-item a");
const sections = document.querySelectorAll(".section");

links.forEach(link => {
link.addEventListener("click",function(e) {
e.preventDefault();
const targetId = this.getAttribute("data-target");
sections.forEach(section => section.style.display = "none");
const targetSection = document.getElementById(targetId);
    if (targetSection) {
      targetSection.style.display = "block";
    }
});
});
