// ---------- Patient Scheduling ----------

window.patients = window.patients || [];


function freezeRowIfLocked(i) {
    const p = patients[i];
    const cell = document.getElementById(`volCell-${i}`);
    if (!p || !cell) return;
    if (p.locked) {
        cell.textContent = (typeof p.lockedMl === "string" && p.lockedMl.length)
            ? p.lockedMl
            : cell.textContent;
    }
}

function respaceRespectingLocks() {
    const start = planStartDate();
    const step = parseInt(el("intervalMin").value, 10) || 20;
    let cursor = new Date(start.getTime());

    for (let i = 0; i < patients.length; i++) {
        const p = patients[i];
        if (p.locked) {
            const lockedDate = dateWithHHMM(start, p.timeHHMM);
            cursor = addMinutes(lockedDate, step);
        } else {
            p.timeHHMM = hhmmFromDate(cursor);
            cursor = addMinutes(cursor, step);
        }
    }
}

function renderPatients() {
    const tbody = el("patientsBody");
    tbody.innerHTML = "";

    if (!window.patients || window.patients.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--muted);">
            No patients added.
        </td></tr>`;
        return;
    }

    window.patients.forEach((p, i) => {
        const tr = document.createElement("tr");
        tr.dataset.idx = i;
        if (p.locked) tr.style.background = "rgba(180,180,180,0.15)";

        tr.innerHTML = `
            <td style="text-align:center;">
                <button data-idx="${i}" data-action="toggle-lock" class="btn small">
                    ${p.locked ? "Unlock" : "Lock"}
                </button>
            </td>
            <td style="text-align:left;">
                <input type="time" class="timeInput" value="${p.timeHHMM || ""}" ${p.locked ? "disabled" : ""} />
            </td>
            <td style="text-align:left;">
                <input type="number" class="doseInput" step="0.01" value="${p.dose || 0}" ${p.locked ? "disabled" : ""} />
            </td>
            <td id="volCell-${i}" style="text-align:left;">${p.volumeRequired || "—"}</td>
        `;

        tbody.appendChild(tr);
    });
}

// --- Add new patient row dynamically ---
function addNewPatient() {
    try {
        const defaultDose = parseFloat(el("targetDose").value) || 0;
        const interval = parseFloat(el("intervalMin").value) || 0;
        const start = planStartDate();
        console.log({ defaultDose, interval, start });

        let lastTime = start;
        if (patients.length > 0) {
            const last = patients[patients.length - 1];
            lastTime = dateWithHHMM(start, last.timeHHMM);
            lastTime = addMinutes(lastTime, interval);
        }

        const newPatient = {
            timeHHMM: hhmmFromDate(lastTime),
            dose: defaultDose,
            locked: false,
            lockedMl: "",
            volumeRequired: ""
        };
        console.log("Adding", newPatient);

        patients.push(newPatient);
        renderPatients();
        recalcOnce();
        // 🔁 Trigger Firestore save
        if (typeof window.debouncedSave === "function") {
            window.debouncedSave("patient-added");
        }


    } catch (err) {
        console.error("addNewPatient failed:", err);
    }
}

function addMinutesHHMM(hhmm, addMin) {
    const [h, m] = (hhmm || "00:00").split(":").map(n => parseInt(n, 10) || 0);
    const d = new Date(2000, 0, 1, h, m, 0, 0);
    d.setMinutes(d.getMinutes() + addMin);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
}

function evalDoses(expr) {
    if (!expr) return 0;

    return expr
        .split("+")
        .map(x => Number(x.trim()))
        .filter(x => !isNaN(x))
        .reduce((a, b) => a + b, 0);
}


function seedFromCount() {
    const doseExpr = el("dosesLabel").textContent.trim();
const count = evalDoses(doseExpr);

    const interval = parseFloat(el("intervalMin").value) || 0;
    const start = planStartDate();
    const defaultDose = parseFloat(el("targetDose").value) || 0;

    const existing = Array.isArray(window.patients) ? window.patients : [];

    // 🧠 1️⃣ If all patients are locked → do nothing
    const allLocked = existing.length > 0 && existing.every(p => p.locked);
    if (allLocked) {
        console.log("🔒 All patients locked — skipping reseed.");
        renderPatients();
        recalcOnce();
        return;
    }

    // 🧠 2️⃣ Find the last locked time to anchor new times
    let cursor = new Date(start.getTime());
    let lastLockedTime = start;
    for (const p of existing) {
        if (p.locked) lastLockedTime = dateWithHHMM(start, p.timeHHMM);
    }
    cursor = addMinutes(lastLockedTime, interval);

    const newPatients = [];

    // 🧠 3️⃣ Iterate over desired count — keep locked, rebuild unlocked
    for (let i = 0; i < count; i++) {
        const prev = existing[i];

        if (prev && prev.locked) {
            newPatients.push({ ...prev });
            // move cursor after locked row
            cursor = addMinutes(dateWithHHMM(start, prev.timeHHMM), interval);
        } else {
            const nextTime = hhmmFromDate(cursor);
            cursor = addMinutes(cursor, interval);

            newPatients.push({
                timeHHMM: nextTime,
                dose: defaultDose,
                locked: false,
                lockedMl: "",
                volumeRequired: ""
            });
        }
    }

    // 🧠 4️⃣ Append any extra locked rows beyond count (never delete them)
    const extraLocked = existing.filter((p, i) => i >= count && p.locked);
    if (extraLocked.length > 0) {
        console.log(`🔒 Preserving ${extraLocked.length} locked rows beyond count.`);
        newPatients.push(...extraLocked);
    }

    // 🧠 5️⃣ Save and refresh
    window.patients = newPatients;
    renderPatients();
    recalcOnce();
}


document.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action='toggle-lock']");
    if (!btn) return;

    const idx = parseInt(btn.dataset.idx, 10);
    const p = patients[idx];
    if (!p) return;

    const cell = document.getElementById(`volCell-${idx}`);
    const tr = btn.closest("tr");
    const timeInput = tr?.querySelector(".timeInput");
    const doseInput = tr?.querySelector(".doseInput");

    // Capture latest inputs
    p.timeHHMM = timeInput?.value || p.timeHHMM;
    p.dose = parseFloat(doseInput?.value) || p.dose;

    // Toggle lock
    p.locked = !p.locked;
    p.lockedMl = p.locked ? (cell?.textContent || "") : "";

    // Update visuals
    renderPatients();
    recalcOnce();

    // 🔁 Trigger Firestore save for lock state change
    if (typeof window.debouncedSave === "function") {
        window.debouncedSave(p.locked ? "patient-locked" : "patient-unlocked");
    }


});

// ✅ Expose helpers globally for main.js
window.renderPatients = renderPatients;
window.addMinutesHHMM = addMinutesHHMM;
window.respaceRespectingLocks = respaceRespectingLocks;
window.freezeRowIfLocked = freezeRowIfLocked;
window.seedFromCount = seedFromCount;
window.addNewPatient = addNewPatient;


// ---------- End of patients.js ----------




