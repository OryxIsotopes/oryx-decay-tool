// ---------- Patient Scheduling ----------

let patients = [];

function planStartDate() {
    const cal = parseLocalDatetime(el("calTime").value);
    const ps = el("planStart").value;
    if (!ps) return cal;
    return dateWithHHMM(cal, ps);
}

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
    const patientsBody = el("patientsBody");
    const doseUnit = el("doseUnit");
    const perPatientDoseUnit = el("perPatientDoseUnit");
    perPatientDoseUnit.textContent = doseUnit.value;

    patientsBody.innerHTML = "";

    patients.forEach((p, i) => {
        const locked = !!p.locked;
        const tr = document.createElement("tr");
        tr.dataset.idx = i;

        tr.innerHTML = `
            <td style="white-space:nowrap;text-align:center;">
                ${i + 1}
                <button class="btn secondary" data-action="toggle-lock" data-idx="${i}" 
                    style="margin-left:8px;padding:4px 8px;">${locked ? "🔒" : "🔓"}</button>
            </td>
            <td>
                <input type="time" class="timeInput" 
                       value="${p.timeHHMM || ''}" 
                       data-idx="${i}" ${locked ? "disabled" : ""} />
            </td>
            <td>
                <input type="number" min="0" step="0.001" 
                       class="doseInput"
                       value="${isFinite(p.dose) ? p.dose : ''}"
                       data-idx="${i}" ${locked ? "disabled" : ""} 
                       style="max-width:100px;text-align:right;" />
                <span class="muted">${doseUnit.value}</span>
            </td>
            <td id="volCell-${i}" style="text-align:left;">—</td>
        `;

        patientsBody.appendChild(tr);
    });
}



function seedFromCount() {
   // const qs = new URLSearchParams(location.search);
    const countFromUrl = parseInt(qs.get("doses"), 10);
    const n = Number.isInteger(countFromUrl) && countFromUrl > 0 ? countFromUrl : 1;
    const defaultDose = parseFloat(el("targetDose").value) || 0;
    const lockedRows = patients.filter(p => p.locked);
    patients = [...lockedRows];
    while (patients.length < n) {
        patients.push({ timeHHMM: hhmmFromDate(planStartDate()), dose: defaultDose, locked: false, lockedMl: "" });
    }
    respaceRespectingLocks();
    renderPatients();
}
