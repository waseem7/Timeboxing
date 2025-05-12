/* Version: 1.29 */
(function () {
        // Prevent duplicate initialization
        if (window.__timeboxInitialized) return;
        window.__timeboxInitialized = true;
  
        document.addEventListener("DOMContentLoaded", function () {
          /* ---------- Utility Functions ---------- */
          function hexToRgb(hex) {
            hex = hex.replace(/^#/, "");
            if (hex.length === 3) { hex = hex.split("").map(x => x + x).join(""); }
            const bigint = parseInt(hex, 16);
            return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
          }
          function adjustColor(hex, factor) {
            const { r, g, b } = hexToRgb(hex);
            const nr = Math.min(255, Math.max(0, Math.round(r * factor)));
            const ng = Math.min(255, Math.max(0, Math.round(g * factor)));
            const nb = Math.min(255, Math.max(0, Math.round(b * factor)));
            return "rgb(" + nr + "," + ng + "," + nb + ")";
          }
          function minutesToTimeString(totalMinutes) {
            let hours = Math.floor(totalMinutes / 60);
            let minutes = totalMinutes % 60;
            let suffix = hours >= 12 ? " PM" : " AM";
            hours = hours % 12;
            if (hours === 0) hours = 12;
            return hours + ":" + (minutes < 10 ? "0" + minutes : minutes) + suffix;
          }
  
          /* ---------- Print Report ---------- */
          function handlePrint() {
            var el;
            el = document.getElementById("printDate"); if (el) el.textContent = new Date().toLocaleDateString();
            el = document.getElementById("printEmployee"); if (el) el.textContent = config.employeeName;
            el = document.getElementById("printLogo"); if (el) el.src = config.companyLogoURL;
            const total = tasks.length;
            const completed = tasks.filter(t => t.done).length;
            const percent = total > 0 ? Math.floor((completed / total) * 100) : 0;
            el = document.getElementById("sumTotal"); if (el) el.textContent = total;
            el = document.getElementById("sumCompleted"); if (el) el.textContent = completed;
            el = document.getElementById("sumPercent"); if (el) el.textContent = percent;
  
            const topPriorities = tasks.filter(t => t.priority >= 4).sort((a, b) => b.priority - a.priority);
            el = document.getElementById("reportPrioritiesList");
            if (el) {
              el.innerHTML =
                topPriorities.length > 0 ?
                topPriorities.map(task => task.text + " [P:" + task.priority + "]").join(' <span class="separator">|</span> ') :
                "None";
            }
  
            const catHours = {};
            tasks.forEach(t => {
              if (t.startTime) {
                const hours = (config.blockDuration * t.duration) / 60;
                catHours[t.category] = (catHours[t.category] || 0) + hours;
              }
            });
            const analyticsArr = [];
            for (const cat in catHours) {
              analyticsArr.push(cat + ": " + catHours[cat].toFixed(2) + " hrs");
            }
            el = document.getElementById("reportAnalyticsContent");
            if (el) {
              el.innerHTML =
                analyticsArr.length > 0 ?
                analyticsArr.join(' <span class="separator">|</span> ') :
                "None";
            }
  
            const brainDumpTasks = tasks.filter(t => !t.startTime);
            el = document.getElementById("reportBrainDumpList");
            if (el) {
              el.innerHTML =
                brainDumpTasks.length > 0 ?
                brainDumpTasks.map(task => task.text + " (" + task.category + ", P:" + task.priority + ")").join(' <span class="separator">|</span> ') :
                "None";
            }
  
            var tableBody = document.getElementById("printTableBody");
            if (tableBody) {
              tableBody.innerHTML = "";
              tasks.forEach(task => {
                const tr = document.createElement("tr");
                let timeCell = "";
                if (task.startTime) {
                  const startMins = timeToMinutes(task.startTime);
                  const endMins = startMins + config.blockDuration * task.duration;
                  timeCell = task.startTime + " to " + minutesToTimeString(endMins);
                }
                tr.innerHTML =
                  "<td>" + task.id + "</td>" +
                  "<td>" + task.text + "</td>" +
                  "<td>" + task.category + "</td>" +
                  "<td>" + (task.flag || "None") + "</td>" +
                  "<td>" + timeCell + "</td>" +
                  "<td>" + task.priority + "</td>" +
                  "<td>" + (task.done ? "✔️ Complete" : "⏳ Pending") + "</td>";
                tableBody.appendChild(tr);
              });
            }
            window.print();
          }
  
          /* ---------- Global Variables ---------- */
          let config = {
            startHour: 9,
            endHour: 18,
            blockDuration: 30,
            breakTimes: "12:00 PM-1:00 PM",
            categories: ["Planning", "Execution", "Follow-up", "Delegation"],
            flags: ["Inventory", "ERP", "Recruitment", "Headhunting", "Organization Chart", "Workflow", "KPI", "Training", "Development", "Personal"],
            employeeName: "Employee Name",
            companyLogoURL: "https://www.adada-kabbani.com/images/adadaKabbaniLogo-mod=w=360,q=85.png",
            themeColor: "Blue",
            themeColors: {
              Blue: "#007acc",
              SkyBlue: "#87ceeb",
              Teal: "#20B2AA",
              Green: "#28a745",
              Lime: "#32cd32",
              Olive: "#556B2F",
              GoldenRod: "#daa520",
              Orange: "#fd7e14",
              Red: "#dc3545",
              Burgundy: "#800020",
              HotPink: "#ff69b4",
              MutedPink: "#d63384",
              Purple: "#6f42c1",
              Violet: "#8a2be2",
              Chocolate: "#d2691e",
              Black: "#000000"
            },
            themeMode: "light",
            muteSounds: false
          };
          let tasks = [];
          let taskIdCounter = 0;
          let undoStack = [];
          let redoStack = [];
          let finalizingTask = false;
          // Apply initial theme and mode toggle icon
          applyTheme(config.themeColor, config.themeMode);
          const modeBtn = document.getElementById('modeToggleBtn');
          if (modeBtn) modeBtn.textContent = config.themeMode === 'light' ? '🌞' : '🌜';
          const modeBtnMobile = document.getElementById('modeToggleBtnMobile');
          if (modeBtnMobile) modeBtnMobile.textContent = config.themeMode === 'light' ? '🌞' : '🌜';
// Initial mute/unmute icons for desktop and mobile
const muteBtnDesktop = document.getElementById('muteBtn');
if (muteBtnDesktop) {
  muteBtnDesktop.querySelector('.icon-glyph').textContent = config.muteSounds ? '🔇' : '🔊';
  muteBtnDesktop.setAttribute('aria-label', config.muteSounds ? 'Unmute Sounds' : 'Mute Sounds');
}
const muteBtnMobile = document.getElementById('muteBtnMobile');
if (muteBtnMobile) {
  muteBtnMobile.querySelector('.icon-glyph').textContent = config.muteSounds ? '🔇' : '🔊';
  muteBtnMobile.setAttribute('aria-label', config.muteSounds ? 'Unmute Sounds' : 'Mute Sounds');
}

  
          /* ---------- Storage Functions ---------- */
          function saveData() {
            localStorage.setItem("timeboxingAddNewData", JSON.stringify({ config, tasks, taskIdCounter }));
          }
          function loadData() {
            const s = localStorage.getItem("timeboxingAddNewData");
            if (s) {
              try {
                const d = JSON.parse(s);
                if (d.config) {
                  if (!d.config.themeColors) { d.config.themeColors = { ...config.themeColors }; }
                  config = d.config;
                  config.startHour = Number(config.startHour);
                  config.endHour = Number(config.endHour);
                  config.blockDuration = Number(config.blockDuration);
                }
                if (d.tasks) tasks = d.tasks;
                if (d.taskIdCounter) taskIdCounter = d.taskIdCounter;
              } catch (e) { console.error(e); }
            }
          }
          loadData();
  
          /* ---------- Sound Functions ---------- */
          function playSound(type) {
            if (config.muteSounds) return; // skip when muted
            const a = document.getElementById("audio" + type.charAt(0).toUpperCase() + type.slice(1));
            if (!a) return;
            a.currentTime = 0;
            a.volume = 0.1;
            a.play();
          }
          function playHoverSound() {
            if (config.muteSounds) return; // skip hover when muted
            const a = document.getElementById("audioHover");
            if (!a) return;
            a.currentTime = 0;
            a.volume = 0.1;
            a.play();
          }
          function playClickSound() {
            if (config.muteSounds) return; // skip click when muted
            const a = document.getElementById("audioClick");
            if (!a) return;
            a.currentTime = 0;
            a.volume = 0.1;
            a.play();
          }
          window.playHoverSound = playHoverSound;
  
          /* ---------- Inline Field Helper ---------- */
          function createInlineField(labelText, inputElement) {
            const container = document.createElement("div");
            container.className = "inline-field";
            const lbl = document.createElement("label");
            lbl.textContent = labelText;
            container.appendChild(lbl);
            container.appendChild(inputElement);
            return container;
          }
  
          /* ---------- Task Entry Finalization ---------- */
          function finalizeAddTask() {
            if (finalizingTask) return;
            finalizingTask = true;
            const txt = document.getElementById("taskInput").value.trim();
            if (!txt) { finalizingTask = false; return; }
            const dur = parseInt(document.getElementById("durationInput").value, 10) || 1;
            const cat = document.getElementById("taskCategory").value;
            const fl = document.getElementById("taskFlag").value;
            const pr = parseInt(document.getElementById("prioritySlider").value, 10);
            const done = document.getElementById("doneToggle").checked;
            const timeAssigned = document.getElementById("taskTime").value;
            const recurrence = document.getElementById("taskRecurrence").value;
            const deadline = document.getElementById("taskDeadline").value;
            const remarks = document.getElementById("taskRemarks").value.trim();
            const parentTask = document.getElementById("taskParent").value;
            tasks.push({
              id: taskIdCounter++,
              text: txt,
              startTime: timeAssigned,
              duration: dur,
              category: cat,
              flag: fl,
              priority: pr,
              done: done,
              recurrence: recurrence,
              deadline: deadline,
              remarks: remarks,
              parentTask: parentTask,
              notified: false
            });
            document.getElementById("taskInput").value = "";
            document.getElementById("durationInput").value = "1";
            document.getElementById("doneToggle").checked = false;
            document.getElementById("taskTime").selectedIndex = 0;
            document.getElementById("taskRecurrence").selectedIndex = 0;
            document.getElementById("taskDeadline").value = "";
            document.getElementById("taskRemarks").value = "";
            document.getElementById("taskParent").selectedIndex = 0;
            playSound("add");
            renderAllViews();
            saveData();
            finalizingTask = false;
          }
          document.addEventListener("click", function(e) {
            const taskEntry = document.getElementById("task-entry");
            if (taskEntry && !taskEntry.contains(e.target)) {
              if (document.getElementById("taskInput").value.trim() !== "") {
                finalizeAddTask();
              }
            }
          });
  
          function populateTaskTimeOptions() {
            const sel = document.getElementById("taskTime");
            if (!sel) return;
            sel.innerHTML = "";
            const optNone = document.createElement("option");
            optNone.value = "";
            optNone.textContent = "No time assigned";
            sel.appendChild(optNone);
            getAllBlocks().forEach(slot => {
              const opt = document.createElement("option");
              opt.value = slot;
              opt.textContent = slot;
              sel.appendChild(opt);
            });
          }
  
          /* ---------- Dropdown Refresh Functions ---------- */
          function refreshCategoryOptions() {
            const sel = document.getElementById("taskCategory");
            if (!sel) return;
            sel.innerHTML = "";
            config.categories.forEach(c => {
              const o = document.createElement("option");
              o.value = c;
              o.textContent = c;
              sel.appendChild(o);
            });
            const addNew = document.createElement("option");
            addNew.value = "add_new";
            addNew.textContent = "Add New…";
            sel.appendChild(addNew);
            const filterSel = document.getElementById("filterCategory");
            if (filterSel) {
              filterSel.innerHTML = '<option value="All">All</option>';
              config.categories.forEach(c => {
                const o = document.createElement("option");
                o.value = c;
                o.textContent = c;
                filterSel.appendChild(o);
              });
            }
          }
          function refreshFlagOptions() {
            const sel = document.getElementById("taskFlag");
            if (!sel) return;
            sel.innerHTML = "";
            const noneOpt = document.createElement("option");
            noneOpt.value = "";
            noneOpt.textContent = "None";
            sel.appendChild(noneOpt);
            config.flags.forEach(f => {
              if (f !== "") {
                const o = document.createElement("option");
                o.value = f;
                o.textContent = f;
                sel.appendChild(o);
              }
            });
            const addNew = document.createElement("option");
            addNew.value = "add_new";
            addNew.textContent = "Add New…";
            sel.appendChild(addNew);
            const filterSel = document.getElementById("filterFlag");
            if (filterSel) {
              filterSel.innerHTML = '<option value="All">All</option>';
              const noneFilter = document.createElement("option");
              noneFilter.value = "";
              noneFilter.textContent = "None";
              filterSel.appendChild(noneFilter);
              config.flags.forEach(f => {
                if (f !== "") {
                  const o = document.createElement("option");
                  o.value = f;
                  o.textContent = f;
                  filterSel.appendChild(o);
                }
              });
            }
          }
          function refreshParentOptions() {
            const sel = document.getElementById("taskParent");
            if (!sel) return;
            sel.innerHTML = "";
            const noneOpt = document.createElement("option");
            noneOpt.value = "";
            noneOpt.textContent = "None";
            sel.appendChild(noneOpt);
            tasks.forEach(task => {
              const o = document.createElement("option");
              o.value = task.id;
              o.textContent = task.text;
              sel.appendChild(o);
            });
            const filterSel = document.getElementById("filterParent");
            if (filterSel) {
              filterSel.innerHTML = '<option value="All">All</option>';
              tasks.forEach(task => {
                const o = document.createElement("option");
                o.value = task.id;
                o.textContent = task.text;
                filterSel.appendChild(o);
              });
            }
          }
  
          /* ---------- Rendering Functions ---------- */
          function renderAllViews() {
            renderTaskList();
            renderAllTasks();
            renderTimeGrid();
            renderStats();
            renderPriorityTasks();
            renderAnalytics();
            refreshParentOptions();
          }
  
          function renderTaskList() {
            const ul = document.getElementById("taskList");
            if (!ul) return;
            ul.innerHTML = "";
            const filterCat = document.getElementById("filterCategory").value;
            const filterFlag = document.getElementById("filterFlag").value;
            const filterParent = document.getElementById("filterParent").value;
            let unassigned = tasks.filter(t => !t.startTime).filter(t => {
              const catMatch = filterCat === "All" || t.category === filterCat;
              const flagMatch = filterFlag === "All" || t.flag === filterFlag;
              const parentMatch = filterParent === "All" || t.parentTask === filterParent;
              return catMatch && flagMatch && parentMatch;
            });
            unassigned.sort((a, b) => (b.priority - a.priority) || (a.id - b.id));
            unassigned.forEach(t => ul.appendChild(createTaskItem(t)));
            ul.addEventListener("dragover", e => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            });
            ul.addEventListener("drop", e => {
              e.preventDefault();
              const tid = e.dataTransfer.getData("text/plain");
              const found = tasks.find(x => x.id === parseInt(tid, 10));
              if (found) { pushUndo(); found.startTime = ""; renderAllViews(); saveData(); }
            });
          }
  
          function renderAllTasks() {
            const allList = document.getElementById("allTasksList");
            if (!allList) return;
            allList.innerHTML = "";
            const filterCat = document.getElementById("filterCategory").value;
            const filterFlag = document.getElementById("filterFlag").value;
            const filterParent = document.getElementById("filterParent").value;
            let sorted = [...tasks].sort((a, b) => a.id - b.id).filter(t => {
              const catMatch = filterCat === "All" || t.category === filterCat;
              const flagMatch = filterFlag === "All" || t.flag === filterFlag;
              const parentMatch = filterParent === "All" || t.parentTask === filterParent;
              return catMatch && flagMatch && parentMatch;
            });
            sorted.forEach(t => allList.appendChild(createTaskItem(t)));
          }
  
          function createTaskItem(task) {
            const li = document.createElement("li");
            li.className = "task-item draggable";
            li.dataset.id = task.id;
            li.draggable = true;
            addDragHandlers(li);
            if (task.startTime) li.classList.add("assigned");
            if (task.done) li.classList.add("done");
            if (task.priority >= 4) li.classList.add("high");
            if (task.startTime) {
              const now = new Date();
              const cMin = now.getHours() * 60 + now.getMinutes();
              const sMin = timeToMinutes(task.startTime);
              const eMin = sMin + config.blockDuration * task.duration;
              if (cMin > eMin) li.classList.add("past");
              else if (cMin >= sMin && cMin < eMin) li.classList.add("active-task");
            }
  
            let timeStr = task.startTime
              ? "Time: " + task.startTime + " to " + minutesToTimeString(timeToMinutes(task.startTime) + config.blockDuration * task.duration)
              : "";
            let deadlineStr = "";
            if (task.deadline) {
              const dl = new Date(task.deadline);
              const now = new Date();
              const diff = dl - now;
              if (diff > 0) { const minutes = Math.floor(diff / 60000); deadlineStr = " (Deadline in " + minutes + " min)"; }
              else { deadlineStr = " (Deadline passed)"; }
            }
            const statusText = task.done ? "✔️ Complete" : "⏳ Pending";
            const info = document.createElement("div");
            info.className = "task-info";
            info.innerHTML =
              "<strong>" + task.text + "</strong> [" + task.category + " | " + (task.flag || "None") + " | P:" + task.priority + "] " + statusText +
              " " + timeStr +
              (task.remarks ? "<br><em>Remarks:</em> " + task.remarks : "") +
              (task.parentTask ? "<br><em>Parent Task:</em> " + getTaskTextById(task.parentTask) : "");
            li.appendChild(info);
  
            const btnBox = document.createElement("div");
            const toggle = document.createElement("button");
            toggle.innerHTML = '<span class="emoji">' + (task.done ? "🔄" : "✅") + "</span>";
            toggle.title = task.done ? "Mark as Undone" : "Mark as Done";
            toggle.addEventListener("click", e => {
              e.stopPropagation();
              pushUndo();
              task.done = !task.done;
              playSound("complete");
              renderAllViews();
              saveData();
            });
            btnBox.appendChild(toggle);
  
            const del = document.createElement("button");
            del.innerHTML = '<span class="emoji">❌</span>';
            del.title = "Delete Task";
            del.addEventListener("click", e => {
              e.stopPropagation();
              pushUndo();
              playSound("delete");
              tasks = tasks.filter(x => x.id !== task.id);
              renderAllViews();
              saveData();
            });
            btnBox.appendChild(del);
  
            li.appendChild(btnBox);
            li.addEventListener("dblclick", () => { pushUndo(); inlineEditTask(li, task); });
            return li;
          }
  
          function getTaskTextById(id) {
            const t = tasks.find(task => task.id == id);
            return t ? t.text : "None";
          }
  
          function inlineEditTask(container, task) {
            container.innerHTML = "";
            container.draggable = false;
            const wrap = document.createElement("div");
            wrap.className = "inline-edit";
            wrap.style.padding = "5px";
            wrap.style.width = "95%";
            wrap.addEventListener("click", e => { e.stopPropagation(); });
            wrap.addEventListener("dblclick", e => { e.stopPropagation(); });
            const txt = document.createElement("input");
            txt.type = "text";
            txt.value = task.text;
            wrap.appendChild(createInlineField("Task Description:", txt));
            const timeSel = document.createElement("select");
            const optNo = document.createElement("option");
            optNo.value = "";
            optNo.textContent = "No time assigned";
            timeSel.appendChild(optNo);
            getAllBlocks().forEach(slot => {
              const o = document.createElement("option");
              o.value = slot;
              o.textContent = slot;
              if (slot === task.startTime) o.selected = true;
              timeSel.appendChild(o);
            });
            wrap.appendChild(createInlineField("Time:", timeSel));
            const dur = document.createElement("input");
            dur.type = "number";
            dur.min = 1;
            dur.max = 10;
            dur.value = task.duration;
            wrap.appendChild(createInlineField("Duration (blocks):", dur));
            const cat = document.createElement("select");
            config.categories.forEach(c => {
              const o = document.createElement("option");
              o.value = c;
              o.textContent = c;
              if (c === task.category) o.selected = true;
              cat.appendChild(o);
            });
            wrap.appendChild(createInlineField("Category:", cat));
            const fl = document.createElement("select");
            config.flags.forEach(f => {
              const o = document.createElement("option");
              o.value = f;
              o.textContent = f === "" ? "None" : f;
              if (f === task.flag) o.selected = true;
              fl.appendChild(o);
            });
            wrap.appendChild(createInlineField("Label:", fl));
            const parentSel = document.createElement("select");
            const noneOpt = document.createElement("option");
            noneOpt.value = "";
            noneOpt.textContent = "None";
            parentSel.appendChild(noneOpt);
            tasks.forEach(t => {
              if (t.id !== task.id) {
                const o = document.createElement("option");
                o.value = t.id;
                o.textContent = t.text;
                if (t.id == task.parentTask) o.selected = true;
                parentSel.appendChild(o);
              }
            });
            wrap.appendChild(createInlineField("Parent Task:", parentSel));
            const remarksInp = document.createElement("input");
            remarksInp.type = "text";
            remarksInp.value = task.remarks || "";
            wrap.appendChild(createInlineField("Remarks:", remarksInp));
            const pr = document.createElement("input");
            pr.type = "range";
            pr.min = 1;
            pr.max = 5;
            pr.value = task.priority;
            pr.addEventListener("mousedown", () => container.draggable = false);
            pr.addEventListener("mouseup", () => container.draggable = true);
            wrap.appendChild(createInlineField("Priority:", pr));
            const recSel = document.createElement("select");
            recSel.innerHTML = "<option value=''>None</option>" +
              "<option value='daily' " + (task.recurrence==="daily" ? "selected" : "") + ">Daily</option>" +
              "<option value='weekly' " + (task.recurrence==="weekly" ? "selected" : "") + ">Weekly</option>";
            wrap.appendChild(createInlineField("Recurrence:", recSel));
            const dlInp = document.createElement("input");
            dlInp.type = "datetime-local";
            dlInp.value = task.deadline || "";
            wrap.appendChild(createInlineField("Deadline:", dlInp));
            const doneCB = document.createElement("input");
            doneCB.type = "checkbox";
            doneCB.checked = task.done;
            wrap.appendChild(createInlineField("Completed:", doneCB));
            function finalize() {
              const newText = txt.value.trim();
              if (newText) {
                task.text = newText;
                task.startTime = timeSel.value;
                task.duration = parseInt(dur.value, 10) || 1;
                task.category = cat.value;
                task.flag = fl.value;
                task.parentTask = parentSel.value;
                task.remarks = remarksInp.value.trim();
                task.priority = parseInt(pr.value, 10);
                task.recurrence = recSel.value;
                task.deadline = dlInp.value;
                task.done = doneCB.checked;
              }
              playSound("edit");
              container.draggable = true;
              renderAllViews();
              saveData();
              document.removeEventListener("click", outsideClick);
            }
            function outsideClick(e) { if (!wrap.contains(e.target)) finalize(); }
            setTimeout(() => document.addEventListener("click", outsideClick), 100);
            container.appendChild(wrap);
            txt.focus();
          }
  
          function inlineEditGridTask(blockDiv, task) {
            blockDiv.innerHTML = "";
            blockDiv.draggable = false;
            const wrap = document.createElement("div");
            wrap.className = "inline-edit";
            wrap.style.padding = "5px";
            wrap.style.display = "block";
            wrap.style.gap = "6px";
            wrap.addEventListener("click", e => { e.stopPropagation(); });
            wrap.addEventListener("dblclick", e => { e.stopPropagation(); });
            const txt = document.createElement("input");
            txt.type = "text";
            txt.value = task.text;
            wrap.appendChild(createInlineField("Task Description:", txt));
            const timeSel = document.createElement("select");
            const optNo = document.createElement("option");
            optNo.value = "";
            optNo.textContent = "No time assigned";
            timeSel.appendChild(optNo);
            getAllBlocks().forEach(slot => {
              const o = document.createElement("option");
              o.value = slot;
              o.textContent = slot;
              if (slot === task.startTime) o.selected = true;
              timeSel.appendChild(o);
            });
            wrap.appendChild(createInlineField("Time:", timeSel));
            const dur = document.createElement("input");
            dur.type = "number";
            dur.min = 1;
            dur.max = 10;
            dur.value = task.duration;
            wrap.appendChild(createInlineField("Duration (blocks):", dur));
            const cat = document.createElement("select");
            config.categories.forEach(c => {
              const o = document.createElement("option");
              o.value = c;
              o.textContent = c;
              if (c === task.category) o.selected = true;
              cat.appendChild(o);
            });
            wrap.appendChild(createInlineField("Category:", cat));
            const fl = document.createElement("select");
            config.flags.forEach(f => {
              const o = document.createElement("option");
              o.value = f;
              o.textContent = f === "" ? "None" : f;
              if (f === task.flag) o.selected = true;
              fl.appendChild(o);
            });
            wrap.appendChild(createInlineField("Label:", fl));
            const parentSel = document.createElement("select");
            const noneOpt = document.createElement("option");
            noneOpt.value = "";
            noneOpt.textContent = "None";
            parentSel.appendChild(noneOpt);
            tasks.forEach(t => {
              if (t.id !== task.id) {
                const o = document.createElement("option");
                o.value = t.id;
                o.textContent = t.text;
                if (t.id == task.parentTask) o.selected = true;
                parentSel.appendChild(o);
              }
            });
            wrap.appendChild(createInlineField("Parent Task:", parentSel));
            const remarksInp = document.createElement("input");
            remarksInp.type = "text";
            remarksInp.value = task.remarks || "";
            wrap.appendChild(createInlineField("Remarks:", remarksInp));
            const pr = document.createElement("input");
            pr.type = "range";
            pr.min = 1;
            pr.max = 5;
            pr.value = task.priority;
            pr.addEventListener("mousedown", () => blockDiv.draggable = false);
            pr.addEventListener("mouseup", () => blockDiv.draggable = true);
            wrap.appendChild(createInlineField("Priority:", pr));
            const recSel = document.createElement("select");
            recSel.innerHTML = "<option value=''>None</option>" +
              "<option value='daily' " + (task.recurrence==="daily" ? "selected" : "") + ">Daily</option>" +
              "<option value='weekly' " + (task.recurrence==="weekly" ? "selected" : "") + ">Weekly</option>";
            wrap.appendChild(createInlineField("Recurrence:", recSel));
            const dlInp = document.createElement("input");
            dlInp.type = "datetime-local";
            dlInp.value = task.deadline || "";
            wrap.appendChild(createInlineField("Deadline:", dlInp));
            const doneCB = document.createElement("input");
            doneCB.type = "checkbox";
            doneCB.checked = task.done;
            wrap.appendChild(createInlineField("Completed:", doneCB));
            function finalize() {
              const newText = txt.value.trim();
              if (newText) {
                task.text = newText;
                task.startTime = timeSel.value;
                task.duration = parseInt(dur.value, 10) || 1;
                task.category = cat.value;
                task.flag = fl.value;
                task.parentTask = parentSel.value;
                task.remarks = remarksInp.value.trim();
                task.priority = parseInt(pr.value, 10);
                task.recurrence = recSel.value;
                task.deadline = dlInp.value;
                task.done = doneCB.checked;
              }
              playSound("edit");
              blockDiv.draggable = true;
              renderAllViews();
              saveData();
              document.removeEventListener("click", outsideClick);
            }
            function outsideClick(e) { if (!wrap.contains(e.target)) finalize(); }
            setTimeout(() => document.addEventListener("click", outsideClick), 100);
            blockDiv.appendChild(wrap);
            txt.focus();
          }
  
          /* ---------- Drag & Drop ---------- */
          function addDragHandlers(el) {
            el.setAttribute("aria-grabbed", "false");
            el.addEventListener("dragstart", e => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", el.dataset.id);
              el.classList.add("dragging");
              el.setAttribute("aria-grabbed", "true");
            });
            el.addEventListener("dragend", () => {
              el.classList.remove("dragging");
              el.setAttribute("aria-grabbed", "false");
            });
            el.style.cursor = "move";
          }
  
          /* ---------- makeDroppable for Time Grid Cells ---------- */
          function makeDroppable(cell) {
            cell.addEventListener("dragover", e => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              cell.classList.add("over");
            });
            cell.addEventListener("dragleave", () => cell.classList.remove("over"));
            cell.addEventListener("drop", e => {
              e.preventDefault();
              cell.classList.remove("over");
              const tid = e.dataTransfer.getData("text/plain");
              const found = tasks.find(x => x.id === parseInt(tid, 10));
              if (found) {
                pushUndo();
                found.startTime = cell.dataset.time;
                renderAllViews();
                saveData();
              }
            });
            cell.addEventListener("dblclick", () => {
              if (cell.querySelector(".inline-edit")) return;
              pushUndo();
              const form = document.createElement("div");
              form.className = "inline-edit";
              form.style.display = "flex";
              form.style.flexWrap = "wrap";
              form.style.gap = "4px";
              const txt = document.createElement("input");
              txt.type = "text";
              txt.placeholder = "New Task";
              form.appendChild(txt);
              const dur = document.createElement("input");
              dur.type = "number";
              dur.min = 1;
              dur.max = 10;
              dur.value = 1;
              form.appendChild(dur);
              const cat = document.createElement("select");
              config.categories.forEach(c => {
                const o = document.createElement("option");
                o.value = c;
                o.textContent = c;
                cat.appendChild(o);
              });
            // v1.21: Mobile tap and touchstart to invoke dblclick
            cell.addEventListener("click", function(e) {
              if (window.innerWidth <= 768 && !cell.querySelector(".inline-edit")) {
                e.preventDefault();
                cell.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
              }
            });
            cell.addEventListener("touchstart", function(e) {
              if (window.innerWidth <= 768 && !cell.querySelector(".inline-edit")) {
                e.preventDefault();
                cell.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
              }
            });

              form.appendChild(cat);
              const fl = document.createElement("select");
              config.flags.forEach(f => {
                const o = document.createElement("option");
                o.value = f;
                o.textContent = f === "" ? "None" : f;
                fl.appendChild(o);
              });
              form.appendChild(fl);
              const pr = document.createElement("input");
              pr.type = "range";
              pr.min = 1;
              pr.max = 5;
              pr.value = 3;
              pr.addEventListener("mousedown", e => e.stopPropagation());
              form.appendChild(pr);
              const doneCB = document.createElement("input");
              doneCB.type = "checkbox";
              const lb = document.createElement("label");
              lb.textContent = "Completed";
              form.appendChild(doneCB);
              form.appendChild(lb);
              function finalize() {
                const val = txt.value.trim();
                if (val) {
                  tasks.push({
                    id: taskIdCounter++,
                    text: val,
                    startTime: cell.dataset.time,
                    duration: parseInt(dur.value, 10) || 1,
                    category: cat.value,
                    flag: fl.value,
                    priority: parseInt(pr.value, 10),
                    done: doneCB.checked,
                    parentTask: "",
                    remarks: "",
                    recurrence: "",
                    deadline: "",
                    notified: false
                  });
                  playSound("add");
                }
                if (form.parentNode === cell) cell.removeChild(form);
                renderAllViews();
                saveData();
                document.removeEventListener("mousedown", outsideClick);
              }
              txt.addEventListener("keydown", e => { if (e.key === "Enter") finalize(); });
              function outsideClick(e) { if (!form.contains(e.target)) finalize(); }
              setTimeout(() => document.addEventListener("mousedown", outsideClick), 300);
              cell.appendChild(form);
              txt.focus();
            });
          }
  
          /* ---------- Time Grid Rendering ---------- */
          function renderTimeGrid() {
            var grid = document.getElementById("time-grid");
            if (!grid) return;
            grid.innerHTML = "";
            const table = document.createElement("table");
            const thead = document.createElement("thead");
            const row = document.createElement("tr");
            const hourTH = document.createElement("th");
            hourTH.textContent = "Time";
            row.appendChild(hourTH);
            const cols = Math.ceil(60 / config.blockDuration);
            for (let i = 0; i < cols; i++) {
              const mm = i * config.blockDuration;
              const th = document.createElement("th");
              th.textContent = mm < 10 ? ":0" + mm : ":" + mm;
              row.appendChild(th);
            }
            thead.appendChild(row);
            table.appendChild(thead);
            const tbody = document.createElement("tbody");
            for (let h = config.startHour; h < config.endHour; h++) {
              const tr = document.createElement("tr");
              const hCell = document.createElement("th");
              hCell.textContent = formatHour(h);
              tr.appendChild(hCell);
              for (let i = 0; i < cols; i++) {
                const mm = i * config.blockDuration;
                if (mm >= 60) break;
                const td = document.createElement("td");
                td.dataset.time = formatHourSlot(h, mm);
                if (isBreakTime(td.dataset.time)) td.classList.add("break-cell");
                makeDroppable(td);
                appendAssignedTasks(td, td.dataset.time);
                tr.appendChild(td);
              }
              tbody.appendChild(tr);
            }
            table.appendChild(tbody);
            grid.appendChild(table);
          }
  
          function isBreakTime(str) {
            if (!str) return false;
            const arr = config.breakTimes.split(/[;,]+/).map(x => x.trim());
            const tVal = timeToMinutes(str);
            for (const b of arr) {
              const [st, en] = b.split("-");
              if (st && en) {
                const sMin = timeToMinutes(st.trim());
                const eMin = timeToMinutes(en.trim());
                if (tVal >= sMin && tVal < eMin) return true;
              }
            }
            return false;
          }
  
          function appendAssignedTasks(cell, timeStr) {
            const cellMin = timeToMinutes(timeStr);
            tasks.forEach(task => {
              if (!task.startTime) return;
              const startMin = timeToMinutes(task.startTime);
              const endMin = startMin + config.blockDuration * task.duration;
              if (cellMin >= startMin && cellMin < endMin) {
                const block = document.createElement("div");
                block.className = "task-block draggable";
                block.dataset.id = task.id;
                block.draggable = true;
                let dlStr = "";
                if (task.deadline) {
                  const dl = new Date(task.deadline);
                  const now = new Date();
                  const diff = dl - now;
                  if (diff > 0) { const minutes = Math.floor(diff / 60000); dlStr = " (Deadline in " + minutes + " min)"; }
                  else { dlStr = " (Deadline passed)"; }
                }
                const statusText = task.done ? "✔️ Complete" : "⏳ Pending";
                const textSpan = document.createElement("span");
                textSpan.className = "block-text";
                textSpan.textContent = task.text + " [" + task.startTime + " to " + minutesToTimeString(timeToMinutes(task.startTime) + config.blockDuration * task.duration) + "] " + statusText + dlStr;
  
                const btnContainer = document.createElement("div");
                btnContainer.className = "block-buttons";
                const doneBtn = document.createElement("button");
                doneBtn.innerHTML = "✅";
                doneBtn.title = task.done ? "Mark as Undone" : "Mark as Done";
                doneBtn.addEventListener("click", function(e) {
                  e.stopPropagation();
                  pushUndo();
                  task.done = !task.done;
                  playSound("complete");
                  renderAllViews();
                  saveData();
                });
                const delBtn = document.createElement("button");
                delBtn.innerHTML = "❌";
                delBtn.title = "Delete Task";
                delBtn.addEventListener("click", function(e) {
                  e.stopPropagation();
                  pushUndo();
                  playSound("delete");
                  tasks = tasks.filter(x => x.id !== task.id);
                  renderAllViews();
                  saveData();
                });
                btnContainer.appendChild(doneBtn);
                btnContainer.appendChild(delBtn);
  
                block.appendChild(textSpan);
                block.appendChild(btnContainer);
  
                const now = new Date();
                const currentMins = now.getHours() * 60 + now.getMinutes();
                if (currentMins >= startMin && currentMins < endMin) { block.classList.add("active-task"); }
  
                block.addEventListener("dblclick", e => {
                  e.stopPropagation();
                  pushUndo();
                  block.draggable = false;
                  inlineEditGridTask(block, task);
                });
                addDragHandlers(block);
                cell.appendChild(block);
              }
            });
          }
  
          function startTimer() {
            if ("Notification" in window && Notification.permission !== "granted") { Notification.requestPermission(); }
            setInterval(() => {
              const now = new Date();
              const cSec = now.getSeconds();
              const cMin = now.getHours() * 60 + now.getMinutes();
              const cTime = now.toLocaleTimeString();
              let disp = "Current Time: " + cTime;
              let activeTasks = [];
              tasks.forEach(t => {
                if (t.startTime) {
                  const sMin = timeToMinutes(t.startTime);
                  const eMin = sMin + config.blockDuration * t.duration;
                  if (cMin >= sMin && cMin < eMin) activeTasks.push(t);
                }
                if (t.deadline) {
                  const dl = new Date(t.deadline);
                  const diff = dl - now;
                  if (diff > 0 && diff < 15 * 60000 && !t.notified) {
                    if (Notification.permission === "granted") {
                      new Notification("Task Deadline Approaching", { body: t.text + " deadline in " + Math.floor(diff / 60000) + " minutes" });
                      t.notified = true;
                    }
                  }
                }
              });
              if (activeTasks.length) {
                const first = activeTasks[0];
                const sMin = timeToMinutes(first.startTime);
                const eMin = sMin + config.blockDuration * first.duration;
                const remainSec = (eMin - cMin) * 60 - cSec;
                const mm = Math.floor(remainSec / 60);
                const ss = remainSec % 60;
                disp += " | Active: " + activeTasks.map(x => x.text).join(", ") + " (" + mm + "m " + (ss < 10 ? "0" + ss : ss) + "s left)";
              }
              var timerDisplay = document.getElementById("timerDisplay");
              if (timerDisplay) timerDisplay.textContent = disp;
            }, 1000);
          }
  
          function renderStats() {
            const total = tasks.length;
            const doneCount = tasks.filter(t => t.done).length;
            const percent = total > 0 ? Math.floor((doneCount / total) * 100) : 0;
            var el;
            el = document.getElementById("statTotal"); if (el) el.textContent = total;
            el = document.getElementById("statDone"); if (el) el.textContent = doneCount;
            el = document.getElementById("statProgress"); if (el) el.style.width = percent + "%";
            el = document.getElementById("statPercent"); if (el) el.textContent = percent + "%";
          }
  
          function renderPriorityTasks() {
            const container = document.getElementById("priorityTaskList");
            if (!container) return;
            const highTasks = tasks.filter(t => t.priority >= 4).sort((a, b) => b.priority - a.priority);
            container.innerHTML = highTasks.length > 0 ?
              highTasks.map(t => t.text + " [P:" + t.priority + "]").join(' <span class="separator">|</span> ') :
              "None";
          }
  
          function renderAnalytics() {
            const analyticsContainer = document.getElementById("hoursPerCategory");
            if (!analyticsContainer) return;
            const catHours = {};
            tasks.forEach(t => {
              if (t.startTime) {
                const hours = (config.blockDuration * t.duration) / 60;
                catHours[t.category] = (catHours[t.category] || 0) + hours;
              }
            });
            const analyticsArr = [];
            for (const cat in catHours) {
              analyticsArr.push(cat + ": " + catHours[cat].toFixed(2) + " hrs");
            }
            analyticsContainer.innerHTML = analyticsArr.length > 0 ?
              analyticsArr.join(' <span class="separator">|</span> ') :
              "None";
  
            const topTasks = [...tasks].sort((a, b) => b.priority - a.priority).slice(0, 5);
            const topContainer = document.getElementById("topTasksByPriority");
            if (topContainer) {
              topContainer.innerHTML = topTasks.length > 0 ?
                topTasks.map(t => t.text + " [P:" + t.priority + "]").join(' <span class="separator">|</span> ') :
                "None";
            }
          }
  
          function exportDataCSV() {
            let csv = "# Timeboxing Multi‑Block CSV\n";
            csv += "# Global Settings\n";
            csv += "startHour," + config.startHour + "\n";
            csv += "endHour," + config.endHour + "\n";
            csv += "blockDuration," + config.blockDuration + "\n";
            csv += "breakTimes," + config.breakTimes + "\n";
            csv += "action," + config.categories.join(",") + "\n";
            csv += "category," + config.flags.join(",") + "\n";
            csv += "employeeName," + config.employeeName + "\n";
            csv += "companyLogoURL," + csvEscape(config.companyLogoURL) + "\n\n";
            csv += "id,text,startTime,duration,action,category,parentTask,remarks,priority,done,recurrence,deadline\n";
            tasks.forEach(t => {
              csv += [
                t.id,
                csvEscape(t.text),
                csvEscape(t.startTime),
                t.duration,
                csvEscape(t.category),
                csvEscape(t.flag),
                csvEscape(t.parentTask),
                csvEscape(t.remarks),
                t.priority,
                t.done,
                csvEscape(t.recurrence),
                csvEscape(t.deadline)
              ].join(",") + "\n";
            });
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "timeboxing_tasks.csv";
            a.click();
            URL.revokeObjectURL(url);
          }
  
          function csvEscape(str) {
            return !str ? "" : '"' + str.replace(/"/g, '""') + '"';
          }
  
          function parseCSVLine(line) {
            const res = [];
            let current = "";
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
              const c = line[i];
              if (c === '"') {
                if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
                else { inQuotes = !inQuotes; }
              } else if (c === "," && !inQuotes) { res.push(current); current = ""; }
              else { current += c; }
            }
            res.push(current);
            return res;
          }
  
          function importDataCSV(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
              pushUndo();
              try {
                const lines = ev.target.result.split(/\r?\n/);
                let configLines = [];
                let tasksLines = [];
                let inTasksSection = false;
                for (let line of lines) {
                  if (line.trim() === "") { inTasksSection = true; continue; }
                  if (line.startsWith("#")) continue;
                  if (!inTasksSection) {
                    if (line.startsWith("id,")) { inTasksSection = true; continue; }
                    configLines.push(line);
                  } else { tasksLines.push(line); }
                }
                configLines.forEach(line => {
                  const parts = parseCSVLine(line);
                  if (parts.length < 2) return;
                  const key = parts[0].trim();
                  const values = parts.slice(1).map(x => x.trim());
                  if (key === "startHour" || key === "endHour" || key === "blockDuration") {
                    config[key] = parseInt(values[0], 10);
                  } else if (key === "breakTimes") {
                    config[key] = values[0];
                  } else if (key === "action") { config.categories = values; }
                  else if (key === "category") { config.flags = values; }
                  else if (key === "employeeName" || key === "companyLogoURL") { config[key] = values[0]; }
                });
                if (tasksLines.length > 0 && tasksLines[0].startsWith("id,")) {
                  tasksLines = tasksLines.slice(1);
                }
                const arr = [];
                tasksLines.forEach(line => {
                  const cols = parseCSVLine(line);
                  if (cols.length < 12) return;
                  arr.push({
                    id: parseInt(cols[0], 10),
                    text: cols[1],
                    startTime: cols[2],
                    duration: parseInt(cols[3], 10) || 1,
                    category: cols[4],
                    flag: cols[5],
                    parentTask: cols[6],
                    remarks: cols[7],
                    priority: parseInt(cols[8], 10),
                    done: cols[9] === "true",
                    recurrence: cols[10],
                    deadline: cols[11],
                    notified: false
                  });
                });
                tasks = arr;
                taskIdCounter = arr.reduce((max, t) => Math.max(max, t.id), 0) + 1;
                renderAllViews();
                saveData();
              } catch (err) { alert("Import failed: invalid CSV file."); }
            };
            reader.readAsText(file);
          }
  
          function getAllBlocks() {
            const blocks = [];
            for (let h = config.startHour; h < config.endHour; h++) {
              for (let m = 0; m < 60; m += config.blockDuration) {
                blocks.push(formatHourSlot(h, m));
              }
            }
            return blocks;
          }
          function formatHour(h24) {
            const suffix = h24 < 12 ? " AM" : " PM";
            let h12 = h24 % 12; if (h12 === 0) h12 = 12;
            return h12 + suffix;
          }
          function formatHourSlot(h24, m) {
            let h12 = h24 % 12; if (h12 === 0) h12 = 12;
            const mm = m < 10 ? "0" + m : m;
            const suffix = h24 < 12 ? " AM" : " PM";
            return h12 + ":" + mm + suffix;
          }
          function timeToMinutes(str) {
            if (!str) return -1;
            const parts = str.split(" ");
            if (parts.length === 1) {
              const [hh, mm] = parts[0].split(":").map(x => parseInt(x));
              return hh * 60 + mm;
            } else {
              let [hh, mm] = parts[0].split(":").map(x => parseInt(x));
              if (parts[1] === "PM" && hh < 12) hh += 12;
              if (parts[1] === "AM" && hh === 12) hh = 0;
              return hh * 60 + mm;
            }
          }
  
          function pushUndo() {
            undoStack.push({ tasks: JSON.parse(JSON.stringify(tasks)), taskIdCounter: taskIdCounter });
            redoStack = [];
          }
          function doUndo() {
            if (!undoStack.length) { alert("Nothing to undo."); return; }
            redoStack.push({ tasks: JSON.parse(JSON.stringify(tasks)), taskIdCounter: taskIdCounter });
            const prev = undoStack.pop();
            tasks = prev.tasks;
            taskIdCounter = prev.taskIdCounter;
            renderAllViews();
            saveData();
          }
          function doRedo() {
            if (!redoStack.length) { alert("Nothing to redo."); return; }
            undoStack.push({ tasks: JSON.parse(JSON.stringify(tasks)), taskIdCounter: taskIdCounter });
            const next = redoStack.pop();
            tasks = next.tasks;
            taskIdCounter = next.taskIdCounter;
            renderAllViews();
            saveData();
          }
  
          function syncCalendar() {
            playClickSound();
            alert("Calendar Synced successfully!");
            console.log("Calendar Sync: ", tasks);
          }
  
          /* ---------- Mobile Enhancements: Reposition Time Grid ---------- */
          function repositionTimeGrid() {
            var timeGrid = document.getElementById("time-grid");
            var leftPanel = document.getElementById("left-panel");
            var filterSection = document.getElementById("filter-section");
            var rightPanel = document.getElementById("right-panel");
            if (timeGrid && leftPanel && filterSection && rightPanel) {
              if (window.innerWidth <= 768) {
                if (timeGrid.parentNode !== leftPanel) {
                  leftPanel.insertBefore(timeGrid, document.getElementById("priorityTasks"));
                }
              } else {
                if (timeGrid.parentNode !== rightPanel) {
                  var header = rightPanel.querySelector("h2");
                  if (header && header.nextElementSibling && header.nextElementSibling.tagName.toLowerCase() === "p") {
                    rightPanel.insertBefore(timeGrid, header.nextElementSibling.nextSibling);
                  } else {
                    rightPanel.appendChild(timeGrid);
                  }
                }
              }
            }
          }
          window.addEventListener("resize", repositionTimeGrid);
  
          /* ---------- Mobile Enhancements: Collapsible Task Entry Panel ---------- */
          function initializeTaskEntryCollapse() {
            const additionalFields = document.getElementById("additionalTaskFields");
            const toggleBtn = document.getElementById("toggleTaskEntryBtn");
            if (!additionalFields || !toggleBtn) return;
            if (window.innerWidth <= 768) {
              additionalFields.classList.add("collapsed");
              additionalFields.classList.remove("expanded");
              toggleBtn.textContent = "Show More";
            } else {
              additionalFields.classList.add("expanded");
              additionalFields.classList.remove("collapsed");
              toggleBtn.textContent = "Show Less";
            }
          }
          function toggleTaskEntry() {
            const additionalFields = document.getElementById("additionalTaskFields");
            const toggleBtn = document.getElementById("toggleTaskEntryBtn");
            if (!additionalFields || !toggleBtn) return;
            if (additionalFields.classList.contains("collapsed")) {
              additionalFields.classList.remove("collapsed");
              additionalFields.classList.add("expanded");
              toggleBtn.textContent = "Show Less";
            } else {
              additionalFields.classList.remove("expanded");
              additionalFields.classList.add("collapsed");
              toggleBtn.textContent = "Show More";
            }
          }
  
          /* ---------- Setup Mobile Menu Pane ---------- */
          function setupMobileMenu() {
            const hamburger = document.getElementById("mobileHamburger");
            const mobilePane = document.getElementById("mobileMenuPane");
            if (hamburger && mobilePane) {
              hamburger.addEventListener("click", () => {
                mobilePane.classList.toggle("open");
              });
              // Close mobile pane if clicked outside
              document.addEventListener("click", (e) => {
                if (!mobilePane.contains(e.target) && !hamburger.contains(e.target)) {
                  mobilePane.classList.remove("open");
                }
              });
              // Import CSV mobile
              const importBtnMobile = document.getElementById("importBtnMobile");
              const importFileMobile = document.getElementById("importFileMobile");
              if (importBtnMobile && importFileMobile) {
                importBtnMobile.addEventListener("click", () => {
                  playClickSound();
                  importFileMobile.click();
                });
                importFileMobile.addEventListener("change", importDataCSV);
              }
              // Other mobile button mappings
              const mappings = [
                { mobileId: "exportBtnMobile",      handler: () => { playClickSound(); exportDataCSV(); } },
                { mobileId: "printBtnMobile",       handler: () => { playClickSound(); handlePrint(); } },
                { mobileId: "clearBtnMobile",       handler: () => { playClickSound(); pushUndo(); tasks=[]; taskIdCounter=0; renderAllViews(); saveData(); } },
                { mobileId: "undoBtnMobile",        handler: () => { playClickSound(); doUndo(); } },
                { mobileId: "redoBtnMobile",        handler: () => { playClickSound(); doRedo(); } },
                { mobileId: "gearBtnMobile",        handler: () => document.getElementById("gearBtn").click() },
                { mobileId: "helpBtnMobile",        handler: () => document.getElementById("helpBtn").click() },
                { mobileId: "themeBtnMobile",       handler: () => document.getElementById("themeBtn").click() },
                { mobileId: "modeToggleBtnMobile",  handler: () => document.getElementById("modeToggleBtn").click() },
                                { mobileId: "calendarSyncBtnMobile",handler: () => document.getElementById("calendarSyncBtn").click() }
              ];
              mappings.forEach(map => {
                const btn = document.getElementById(map.mobileId);
                if (btn) {
                  btn.addEventListener("click", map.handler);
                }
              });
            }
          }
          /* ---------- Setup Panels & Listeners ---------- */
          function setupConfigPanel() {
            const gear = document.getElementById("gearBtn");
            const panel = document.getElementById("configPanel");
            if (gear && panel) {
              gear.addEventListener("click", function () {
                playClickSound();
                panel.style.display = (panel.style.display === "block") ? "none" : "block";
                document.getElementById("startHour").value = config.startHour;
                document.getElementById("endHour").value = config.endHour;
                document.getElementById("blockDuration").value = config.blockDuration;
                document.getElementById("breakTimes").value = config.breakTimes;
                document.getElementById("catList").value = config.categories.join("\n");
                document.getElementById("flagList").value = config.flags.join("\n");
                document.getElementById("employeeName").value = config.employeeName;
                document.getElementById("companyLogoURL").value = config.companyLogoURL;
              });
            }
            const cancelBtn = document.getElementById("cancelConfigBtn");
            if (cancelBtn && panel) {
              cancelBtn.addEventListener("click", function () { panel.style.display = "none"; });
            }
            const saveBtn = document.getElementById("saveConfigBtn");
            if (saveBtn) {
              saveBtn.addEventListener("click", function () {
                pushUndo();
                const sH = parseInt(document.getElementById("startHour").value, 10) || 9;
                const eH = parseInt(document.getElementById("endHour").value, 10) || 18;
                const bD = parseInt(document.getElementById("blockDuration").value, 10) || 30;
                const brk = document.getElementById("breakTimes").value || "12:00 PM-1:00 PM";
                const cats = document.getElementById("catList").value.split(/\n+/).map(x => x.trim()).filter(Boolean);
                const fls = document.getElementById("flagList").value.split(/\n+/).map(x => x.trim()).filter(Boolean);
                const emp = document.getElementById("employeeName").value.trim() || "Employee Name";
                const logo = document.getElementById("companyLogoURL").value.trim();
                if (eH <= sH) { alert("End hour must be greater than start hour!"); return; }
                config.startHour = sH;
                config.endHour = eH;
                config.blockDuration = bD;
                config.breakTimes = brk;
                config.categories = cats;
                config.flags = fls;
                config.employeeName = emp;
                config.companyLogoURL = logo;
                panel.style.display = "none";
                refreshCategoryOptions();
                refreshFlagOptions();
                updateEmployeeAndLogo();
                renderAllViews();
                saveData();
              });
            }
          }
  
          function setupHelpModal() {
            const helpBtn = document.getElementById("helpBtn");
            const helpModal = document.getElementById("helpModal");
            const closeHelpBtn = document.getElementById("closeHelpBtn");
            if (helpBtn && helpModal) {
              helpBtn.addEventListener("click", () => { helpModal.style.display = "flex"; });
              if (closeHelpBtn) { closeHelpBtn.addEventListener("click", () => { helpModal.style.display = "none"; }); }
              helpModal.addEventListener("click", e => { if (e.target === helpModal) helpModal.style.display = "none"; });
            }
          }
  
          function setupCategoryAddNew() {
            const sel = document.getElementById("taskCategory");
            if (!sel) return;
            sel.addEventListener("change", () => {
              if (sel.value === "add_new") {
                showInlineAddBox("catInlineBox", newVal => {
                  newVal = newVal.trim();
                  if (!newVal) return;
                  if (!config.categories.some(c => c.toLowerCase() === newVal.toLowerCase())) {
                    config.categories.splice(config.categories.length - 1, 0, newVal);
                    refreshCategoryOptions();
                  }
                  sel.value = newVal;
                  saveData();
                });
              }
            });
          }
          function setupFlagAddNew() {
            const sel = document.getElementById("taskFlag");
            if (!sel) return;
            sel.addEventListener("change", () => {
              if (sel.value === "add_new") {
                showInlineAddBox("flagInlineBox", newVal => {
                  newVal = newVal.trim();
                  if (!newVal) return;
                  if (!config.flags.some(f => f.toLowerCase() === newVal.toLowerCase())) {
                    config.flags.splice(config.flags.length - 1, 0, newVal);
                    refreshFlagOptions();
                  }
                  sel.value = newVal;
                  saveData();
                });
              }
            });
          }
          function showInlineAddBox(containerId, onSave) {
            const box = document.getElementById(containerId);
            if (!box) return;
            box.innerHTML = "";
            box.style.display = "inline-block";
            const inp = document.createElement("input");
            inp.type = "text";
            inp.placeholder = "New value";
            inp.name = containerId;
            box.appendChild(inp);
            function finalize() { onSave(inp.value); box.style.display = "none"; box.innerHTML = ""; }
            inp.addEventListener("keydown", e => { if (e.key === "Enter") finalize(); });
            function outsideClick(e) { if (!box.contains(e.target)) finalize(); }
            setTimeout(() => document.addEventListener("mousedown", outsideClick), 50);
            inp.focus();
          }
          function setupEmployeeNameEdit() {
            const span = document.getElementById("employeeNameDisplay");
            if (!span) return;
            span.addEventListener("dblclick", () => {
              const inp = document.createElement("input");
              inp.type = "text";
              inp.value = config.employeeName;
              inp.style.fontSize = "1rem";
              inp.name = "employeeNameEdit";
              inp.style.transition = "transform 0.2s ease";
              inp.addEventListener("focus", () => { inp.style.transform = "scale(1.05)"; });
              inp.addEventListener("blur", () => {
                pushUndo();
                config.employeeName = inp.value.trim() || "Employee Name";
                updateEmployeeAndLogo();
                saveData();
                inp.style.transform = "scale(1)";
              });
              span.textContent = "";
              span.appendChild(inp);
              inp.focus();
            });
          }
          function updateEmployeeAndLogo() {
            var el = document.getElementById("employeeNameDisplay");
            if (el) el.textContent = config.employeeName;
            el = document.getElementById("printEmployee");
            if (el) el.textContent = config.employeeName;
            const logoImg = document.getElementById("companyLogo");
            const printLogo = document.getElementById("printLogo");
            if (config.companyLogoURL) {
              if (logoImg) {
                logoImg.src = config.companyLogoURL;
                logoImg.style.display = "block";
                logoImg.onerror = function () { this.src = "https://via.placeholder.com/150?text=Logo"; };
              }
              if (printLogo) {
                printLogo.src = config.companyLogoURL;
                printLogo.style.display = "block";
                printLogo.onerror = function () { this.src = "https://via.placeholder.com/150?text=Logo"; };
              }
            } else {
              if (logoImg) logoImg.style.display = "none";
              if (printLogo) printLogo.style.display = "none";
            }
          }
          function applyTheme(color, mode) {
            const themeColors = config.themeColors || {};
            const accentHex = themeColors[color] || themeColors.Blue;
            document.documentElement.style.setProperty("--accent-color", accentHex);
            document.documentElement.style.setProperty("--icon-bg", adjustColor(accentHex, 0.9));
            const { r, g, b } = hexToRgb(accentHex);
            document.documentElement.style.setProperty("--light-accent", "rgba(" + r + "," + g + "," + b + ",0.2)");
            if (mode === "dark") {
              document.documentElement.style.setProperty("--background-color", getComputedStyle(document.documentElement).getPropertyValue("--mode-dark-bg"));
              document.documentElement.style.setProperty("--panel-bg", getComputedStyle(document.documentElement).getPropertyValue("--mode-dark-panel"));
              document.documentElement.style.setProperty("--text-color", getComputedStyle(document.documentElement).getPropertyValue("--mode-dark-text"));
              document.body.classList.add("dark-mode");
            } else {
              document.documentElement.style.setProperty("--background-color", getComputedStyle(document.documentElement).getPropertyValue("--mode-light-bg"));
              document.documentElement.style.setProperty("--panel-bg", getComputedStyle(document.documentElement).getPropertyValue("--mode-light-panel"));
              document.documentElement.style.setProperty("--text-color", getComputedStyle(document.documentElement).getPropertyValue("--mode-light-text"));
              document.body.classList.remove("dark-mode");
            }
            document.documentElement.style.setProperty("--header-bg", accentHex);
          }
          const themeBtn = document.getElementById("themeBtn");
          const themeDropdown = document.getElementById("themeDropdown");
          function populateThemeDropdown() {
            if (!themeDropdown) return;
            themeDropdown.innerHTML = "";
            for (const color in config.themeColors) {
              const hex = config.themeColors[color];
              const option = document.createElement("div");
              option.className = "theme-option";
              const nameCell = document.createElement("div");
              nameCell.className = "theme-name";
              nameCell.textContent = color;
              const swatchCell = document.createElement("div");
              swatchCell.className = "theme-swatch";
              swatchCell.style.backgroundColor = hex;
              option.appendChild(nameCell);
              option.appendChild(swatchCell);option.addEventListener("click", e => { e.stopPropagation(); config.themeColor = color; applyTheme(color, config.themeMode); saveData(); themeDropdown.style.display = "none"; });
              themeDropdown.appendChild(option);
            // v1.19: Dark-mode hover text color matching
            option.addEventListener("mouseenter", function() {
              if (document.body.classList.contains("dark-mode")) {
                const nameEl = this.querySelector(".theme-name");
                const colorName = nameEl.textContent;
                const hex = config.themeColors[colorName];
                nameEl.style.color = (colorName === "Black" ? "#ffffff" : hex);
              }
            });
            option.addEventListener("mouseleave", function() {
              if (document.body.classList.contains("dark-mode")) {
                this.querySelector(".theme-name").style.color = "";
              }
            });
            }
          }
          if (themeBtn) {
            themeBtn.addEventListener("mouseenter", () => { populateThemeDropdown(); themeDropdown.style.display = "block"; });
            themeBtn.addEventListener("mouseleave", () => { themeDropdown.style.display = "none"; });
            themeBtn.addEventListener("click", () => {
              playClickSound();
              pushUndo();
              const themes = Object.keys(config.themeColors);
              let currentIndex = themes.indexOf(config.themeColor);
              currentIndex = (currentIndex + 1) % themes.length;
              config.themeColor = themes[currentIndex];
              applyTheme(config.themeColor, config.themeMode);
              saveData();
            });
          }
  
          /* For mobile theme icon, mirror similar behavior – if desired you could also simply hide this dropdown.
             Here we ensure it displays fully by scrolling if necessary.
          */
          const themeBtnMobile = document.getElementById("themeBtnMobile");
          const themeDropdownMobile = document.getElementById("themeDropdownMobile");
          function populateThemeDropdownMobile() {
            if (!themeDropdownMobile) return;
            themeDropdownMobile.innerHTML = "";
            for (const color in config.themeColors) {
              const hex = config.themeColors[color];
              const option = document.createElement("div");
              option.className = "theme-option";
              const nameCell = document.createElement("div");
              nameCell.className = "theme-name";
              nameCell.textContent = color;
              const swatchCell = document.createElement("div");
              swatchCell.className = "theme-swatch";
              swatchCell.style.backgroundColor = hex;
              option.appendChild(nameCell);
              option.appendChild(swatchCell);
              option.addEventListener("click", e => { e.stopPropagation(); config.themeColor = color; applyTheme(color, config.themeMode); saveData(); themeDropdownMobile.style.display = "none"; });
              themeDropdownMobile.appendChild(option);
            }
          }
          if (themeBtnMobile) {
            themeBtnMobile.addEventListener("click", () => {
              playClickSound();
              pushUndo();
              populateThemeDropdownMobile();
              themeDropdownMobile.style.display = "block";
              setTimeout(() => { themeDropdownMobile.style.display = "none"; }, 3000);
            });
          }
  
          /* ---------- Setup Mobile UI Enhancements ---------- */
          initializeTaskEntryCollapse();
          var toggleBtn = document.getElementById("toggleTaskEntryBtn");
          if (toggleBtn) {
            toggleBtn.addEventListener("click", toggleTaskEntry);
          }
          window.addEventListener("resize", function () {
            initializeTaskEntryCollapse();
            repositionTimeGrid();
          });
          repositionTimeGrid();
          setupMobileMenu();
  
          /* ---------- Setup Panels & Listeners ---------- */
          setupConfigPanel();
          setupHelpModal();
          setupEmployeeNameEdit();
          setupCategoryAddNew();
          setupFlagAddNew();
          refreshCategoryOptions();
          refreshFlagOptions();
          updateEmployeeAndLogo();
          renderAllViews();
          startTimer();
          populateTaskTimeOptions();
  
          document.getElementById("filterCategory").addEventListener("change", renderAllViews);
          document.getElementById("filterFlag").addEventListener("change", renderAllViews);
          document.getElementById("filterParent").addEventListener("change", renderAllViews);
  
          document.getElementById("addTaskBtn").addEventListener("click", () => {
            playClickSound();
            if (document.getElementById("taskInput").value.trim()) pushUndo();
            finalizeAddTask();
          });
          document.getElementById("taskInput").addEventListener("keydown", e => {
            if (e.key === "Enter") { if (document.getElementById("taskInput").value.trim()) pushUndo(); finalizeAddTask(); }
          });
          document.getElementById("prioritySlider").addEventListener("mousedown", e => e.stopPropagation());
          document.addEventListener("keydown", e => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") { e.preventDefault(); handlePrint(); }
          });
          document.getElementById("time-grid").addEventListener("drop", function (e) {
            e.preventDefault();
            const cell = e.target.closest("td");
            if (cell && cell.dataset.time) {
              const tid = e.dataTransfer.getData("text/plain");
              const found = tasks.find(x => x.id === parseInt(tid, 10));
              if (found) { pushUndo(); found.startTime = cell.dataset.time; renderAllViews(); saveData(); }
            }
          });
          document.getElementById("importFile").addEventListener("change", importDataCSV);
          document.querySelectorAll(".icon-button").forEach(btn => {
            btn.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); btn.click(); } });
          });
          document.getElementById("modeToggleBtn").addEventListener("click", () => {
            playClickSound();
            pushUndo();
            config.themeMode = config.themeMode === "light" ? "dark" : "light";
            document.getElementById("modeToggleBtn").textContent = config.themeMode === "light" ? "🌞" : "🌜";
            applyTheme(config.themeColor, config.themeMode);
            saveData();
          });
          document.getElementById("importBtn").addEventListener("click", () => { playClickSound(); document.getElementById("importFile").click(); });
          document.getElementById("exportBtn").addEventListener("click", () => { playClickSound(); exportDataCSV(); });
          document.getElementById("printBtn").addEventListener("click", () => { playClickSound(); handlePrint(); });
          document.getElementById("clearBtn").addEventListener("click", () => {
            playClickSound();
            playSound("clear");
            pushUndo();
            tasks = [];
            taskIdCounter = 0;
            renderAllViews();
            saveData();
          });
          document.getElementById("undoBtn").addEventListener("click", () => { playClickSound(); doUndo(); });
          document.getElementById("redoBtn").addEventListener("click", () => { playClickSound(); doRedo(); });
          document.getElementById("calendarSyncBtn").addEventListener("click", () => { syncCalendar(); });
        
          // Mute/Unmute Toggle Binding
          const muteBtn = document.getElementById("muteBtn");
          if (muteBtn) {
            muteBtn.querySelector(".icon-glyph").textContent = config.muteSounds ? "🔇" : "🔊";
            muteBtn.setAttribute("aria-label", config.muteSounds ? "Unmute Sounds" : "Mute Sounds");
            muteBtn.addEventListener("click", function(e) {
              e.stopPropagation();
              playClickSound();
              pushUndo();
              config.muteSounds = !config.muteSounds;
              this.querySelector(".icon-glyph").textContent = config.muteSounds ? "🔇" : "🔊";
              this.setAttribute("aria-label", config.muteSounds ? "Unmute Sounds" : "Mute Sounds");
    // Update mobile mute icon
    const mobileBtn = document.getElementById("muteBtnMobile");
    if (mobileBtn) {
      mobileBtn.querySelector(".icon-glyph").textContent = config.muteSounds ? "🔇" : "🔊";
      mobileBtn.setAttribute("aria-label", config.muteSounds ? "Unmute Sounds" : "Mute Sounds");
    }

              document.getElementById("ariaLive").textContent = config.muteSounds ? "Sounds muted" : "Sounds unmuted";
              saveData();
              showToast(config.muteSounds ? "Sounds muted" : "Sounds unmuted");
            });

// Mobile Mute/Unmute Toggle Binding
const muteBtnMobile = document.getElementById("muteBtnMobile");
if (muteBtnMobile) {
  muteBtnMobile.addEventListener("click", function(e) {
    e.stopPropagation();
    playClickSound();
    pushUndo();
    config.muteSounds = !config.muteSounds;
    // Update desktop icon
    const desktopBtn = document.getElementById("muteBtn");
    if (desktopBtn) {
      desktopBtn.querySelector(".icon-glyph").textContent = config.muteSounds ? "🔇" : "🔊";
      desktopBtn.setAttribute("aria-label", config.muteSounds ? "Unmute Sounds" : "Mute Sounds");
    }
    // Update mobile icon
    this.querySelector(".icon-glyph").textContent = config.muteSounds ? "🔇" : "🔊";
    this.setAttribute("aria-label", config.muteSounds ? "Unmute Sounds" : "Mute Sounds");
    document.getElementById("ariaLive").textContent = config.muteSounds ? "Sounds muted" : "Sounds unmuted";
    saveData();
    showToast(config.muteSounds ? "Sounds muted" : "Sounds unmuted");
  });
}
          }
});
      })();


