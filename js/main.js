// ---------- Main App Bootstrap ----------

const qs = new URLSearchParams(location.search);

function populateIsotopes() {
    const isotope = el("isotope");
    isotope.innerHTML = "";
    const keys = Object.keys(HALF_LIVES_MIN).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    for (const key of keys) {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = key;
        isotope.appendChild(opt);
    }
    const custom = document.createElement("option");
    custom.value = "__custom__";
    custom.textContent = "Custom…";
    isotope.appendChild(custom);
}

function setDefaults() {
    // Default isotope
    const isoParam = qs.get("iso") || "F-18";
    if (HALF_LIVES_MIN[isoParam]) {
        isotope.value = isoParam;
        halfLife.value = HALF_LIVES_MIN[isoParam];
    } else {
        isotope.value = "__custom__";
        if (qs.has("t12min")) halfLife.value = qs.get("t12min");
    }

    if (qs.has("cust")) el("custLabel").textContent = qs.get("cust");
    if (qs.has("doses")) el("dosesLabel").textContent = qs.get("doses");
    if (qs.has("vol")) el("volLabel").textContent = qs.get("vol");
    if (qs.has("batch")) el("batchLabel").textContent = qs.get("batch");


    // --- Expiry Handling ---
    if (qs.has("exp")) {
        let expStr = qs.get("exp");
        if (expStr) expStr = decodeURIComponent(expStr).trim();
        expStr = expStr.replace("%3A", ":").replace(" ", "T");

        let expDate;

        // Force local manual parse if format is YYYY-MM-DDTHH:mm
        const match = expStr.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})$/);
        if (match) {
            const [_, y, mo, d, h, mi] = match.map(Number);
            expDate = new Date(y, mo - 1, d, h, mi, 0, 0);
        } else {
            expDate = new Date(expStr);
        }

        // 🧭 DEBUG OUTPUT
        const now = new Date();
        const diffMs = expDate - now;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHr = (diffMin / 60).toFixed(2);
       // console.log("📅 Expiry raw string:", expStr);
       // console.log("🕓 Parsed expDate (local):", expDate.toString());
       // console.log("🕐 Current time:", now.toString());
       // console.log("⏳ Difference (ms):", diffMs);
       // console.log("⏱ Difference (minutes):", diffMin);
        // console.log("⏰ Difference (hours):", diffHr);

        if (isNaN(expDate)) {
            console.warn("Invalid expiry date:", expStr);
            el("expLabel").textContent = "Invalid expiry";
            el("remainingLabel").textContent = "—";
            return;
        }




        const pad = n => String(n).padStart(2, "0");
        el("expLabel").textContent =
            `${pad(expDate.getDate())}/${pad(expDate.getMonth() + 1)}/${expDate.getFullYear()} ` +
            `${pad(expDate.getHours())}:${pad(expDate.getMinutes())}`;

        const overlay = document.getElementById("expiredOverlay");

        function showExpiredOverlay(expDate) {
            document.querySelector('.wrap').style.display = 'none';
            overlay.style.display = 'flex';

            const now = new Date();
            const diffMin = Math.floor((now - expDate) / 60000);
            const absMin = Math.abs(diffMin);
            const hours = Math.floor(absMin / 60);
            const mins = absMin % 60;

            const timeInfo = document.createElement("p");
            timeInfo.style.color = "var(--muted)";
            timeInfo.style.fontSize = "1rem";
            timeInfo.textContent = `Expired ${hours}h ${mins}m ago (${expDate.toLocaleString()})`;
            overlay.appendChild(timeInfo);
        }

        function updateRemaining() {
            const now = new Date();
            const diffMs = expDate - now;
            const diffMin = Math.floor(diffMs / 60000);
            const absMin = Math.abs(diffMin);
            const hours = Math.floor(absMin / 60);
            const mins = absMin % 60;

            // 🧭 Debug each update
           // console.log("Now:", now.toString(), "DiffMs:", diffMs);

            if (diffMs > 0) {
                // ✅ Still valid
                el("remainingLabel").textContent = `${hours}h ${mins}m remaining`;
                el("remainingLabel").style.color = "var(--ok)";
                document.querySelector('.wrap').style.display = 'block';
                document.getElementById('expiredOverlay').style.display = 'none';
            } else {
                // ❌ Expired
                document.querySelector('.wrap').style.display = 'none';
                const overlay = document.getElementById('expiredOverlay');
                overlay.style.display = 'flex';
                overlay.querySelector("h1").textContent = "⚠️ This batch has expired";
                clearInterval(expiryTimer);
            }
        }

        updateRemaining();
        const expiryTimer = setInterval(updateRemaining, 60000);
    }
    // Helper to show overlay
    function showExpiredOverlay(expDate) {
        document.querySelector('.wrap').style.display = 'none';
        const overlay = document.getElementById('expiredOverlay');
        overlay.style.display = 'flex';

        const now = new Date();
        const diffMin = Math.floor((now - expDate) / 60000);
        const absMin = Math.abs(diffMin);
        const hours = Math.floor(absMin / 60);
        const mins = absMin % 60;

        const timeInfo = document.createElement("p");
        timeInfo.style.color = "var(--muted)";
        timeInfo.style.fontSize = "1rem";
        timeInfo.textContent = `Expired ${hours}h ${mins}m ago (${expDate.toLocaleString()})`;
        overlay.appendChild(timeInfo);
    }


    // Activity
    if (qs.has("a0")) activity0.value = qs.get("a0");
    if (qs.has("unit")) unit.value = (qs.get("unit") === "mCi") ? "mCi" : "MBq";
    if (qs.has("dose")) targetDose.value = qs.get("dose");

    unitLabel.textContent = unit.value;

    // Calibration time
    const now = new Date();
    const defaultCal = new Date(now.getTime() - 60 * 60 * 1000); // 1h ago
    const calStr = qs.get("cal") || defaultCal.toISOString().slice(0, 16);
    calTime.value = normalizeToLocal(calStr);

    // default plan start time = calibration time HH:MM
    const calObj = parseLocalDatetime(calStr);
    el("planStart").value = `${String(calObj.getHours()).padStart(2, "0")}:${String(calObj.getMinutes()).padStart(2, "0")}`;

}

function attachHandlers() {
    const isotope = el("isotope");
    const halfLife = el("halfLife");
    const activity0 = el("activity0");
    const unit = el("unit");
    const calTime = el("calTime");
    const recalcBtn = el("recalc");
    const targetDose = el("targetDose");
    const intervalMinEl = el("intervalMin");
    const addPatientBtn = el("addPatient");
    const seedPatientsBtn = el("seedPatients");
    const patientsBody = el("patientsBody");
    const shareBtn = el("shareLink");

    isotope.addEventListener("change", () => {
        if (isotope.value !== "__custom__")
            halfLife.value = HALF_LIVES_MIN[isotope.value];
        recalcOnce();
    });

    [halfLife, activity0, calTime, targetDose, unit].forEach(elm =>
        elm.addEventListener("input", recalcOnce)
    );
    recalcBtn.addEventListener("click", recalcOnce);

    intervalMinEl.addEventListener("input", () => {
        if (!patients.length) return;
        respaceRespectingLocks();
        renderPatients();
        recalcOnce();
    });

    addPatientBtn.addEventListener("click", () => {
        const defaultDose = parseFloat(targetDose.value) || 0;
        patients.push({ timeHHMM: hhmmFromDate(planStartDate()), dose: defaultDose, locked: false, lockedMl: "" });
        respaceRespectingLocks();
        renderPatients();
        recalcOnce();
    });

    seedPatientsBtn.addEventListener("click", () => {
        seedFromCount();
        recalcOnce();
    });

    patientsBody.addEventListener("click", (e) => {
        const btn = e.target.closest('button[data-action="toggle-lock"]');
        if (!btn) return;
        const idx = parseInt(btn.getAttribute("data-idx"), 10);
        const p = patients[idx];
        const cell = document.getElementById(`volCell-${idx}`);
        if (!p) return;

        if (!p.locked) {
            p.locked = true;
            p.lockedMl = cell ? cell.textContent : "";
        } else {
            p.locked = false;
            p.lockedMl = "";
        }
        renderPatients();
        recalcOnce();
    });

    shareBtn.addEventListener("click", async () => {
        const { iso, t12, a0, un, cal } = currentParams();
        const params = new URLSearchParams();
        params.set("iso", iso);
        if (isFinite(a0)) params.set("a0", String(a0));
        params.set("unit", un);
        if (cal) params.set("cal", toLocalISOWithOffset(cal));
        const url = `${location.origin}${location.pathname}?${params.toString()}`;
        try {
            await navigator.clipboard.writeText(url);
            shareBtn.textContent = "Link Copied ✓";
            setTimeout(() => (shareBtn.textContent = "Copy Shareable Link"), 1400);
        } catch {
            prompt("Copy this link:", url);
        }
    });

    setInterval(recalcOnce, 1000);
}

// Simple recalc that calls core logic (already in utils)
function recalcOnce() {
    // Update "now" field to device time
    const now = new Date();
    nowTime.value = normalizeToLocal(now);

    const { iso, t12, a0, un, cal } = currentParams();

    statusChips.innerHTML = "";
    if (isotope.value !== "__custom__") statusChips.appendChild(chip(`Isotope: ${iso}`));
    if (isFinite(t12)) statusChips.appendChild(chip(`T½ = ${fmt(t12, 3)} min`));
    if (isFinite(a0)) statusChips.appendChild(chip(`A₀ = ${fmt(a0, 3)} ${un}`));

    if (!isFinite(t12) || t12 <= 0) {
        activityNow.textContent = "Enter a valid half-life";
        activityNowAlt.textContent = "—";
        elapsed.textContent = "—";
        elapsedExact.textContent = "—";
        decayFactor.textContent = "—";
        classifyBox(false);
        return;
    }
    if (!isFinite(a0) || a0 < 0 || !cal) {
        activityNow.textContent = "Enter valid A₀ and calibration time";
        activityNowAlt.textContent = "—";
        elapsed.textContent = "—";
        elapsedExact.textContent = "—";
        decayFactor.textContent = "—";
        classifyBox(false);
        return;
    }

    const dtMin = minutesBetween(cal, now);
    const isPre = dtMin < 0;
    const tAbs = Math.abs(dtMin);

    const a0_MBq = convertToMBq(a0, un);
    const aNow_MBq = decay(a0_MBq, dtMin, t12);

    // Display Activity
    const aDisp = convertFromMBq(aNow_MBq, un);
    const aAlt = (un === "MBq") ? (aNow_MBq / MBQ_PER_MCI) : (aNow_MBq * MBQ_PER_MCI);
    activityNow.textContent = `${fmt(aDisp, 2)} ${un}`;
    activityNowAlt.textContent = (un === "MBq")
        ? `${fmt(aAlt, 2)} mCi`
        : `${fmt(aAlt, 2)} MBq`;

    // ---- NEW: Concentration ----
    let vol = parseFloat(qs.get("vol"));
    let concMBqperML = NaN;
    let concMCiperML = NaN;
    if (isFinite(vol) && vol > 0) {

        // always work in MBq internally
        concMBqperML = aNow_MBq / vol;
        concMCiperML = concMBqperML / MBQ_PER_MCI;


        if (un === "MBq") {
            concentrationNow.textContent = `${fmt(concMBqperML, 1)} MBq/mL`;
            concentrationNowAlt.textContent = `${fmt(concMCiperML, 1)} mCi/mL`;
        } else {
            concentrationNow.textContent = `${fmt(concMCiperML, 1)} mCi/mL`;
            concentrationNowAlt.textContent = `${fmt(concMBqperML, 1)} MBq/mL`;
        }

    } else {
        concentrationNow.textContent = "—";
        concentrationNowAlt.textContent = "—";
    }

    // ---- Dose Withdrawal (Required Volume Now) ----
    // Desired dose can be in independent unit (MBq or mCi)
    const desiredDose = parseFloat(targetDose.value);

    if (isFinite(desiredDose) && desiredDose > 0 && isFinite(vol) && vol > 0) {

        // convert desired dose to MBq always internal reference
        let doseMBq = (doseUnit.value === "mCi")
            ? desiredDose * MBQ_PER_MCI
            : desiredDose;

        // concentration always MBq/mL internal
        if (isFinite(concMBqperML) && concMBqperML > 0) {
            const mlNeeded = doseMBq / concMBqperML; // mL required NOW
            requiredVolume.textContent = `${fmt(mlNeeded, 1)} mL`;
            requiredVolumeNote.textContent = `Based on ${fmt(concMBqperML, 1)} MBq/mL`;
        } else {
            requiredVolume.textContent = "—";
            requiredVolumeNote.textContent = "Set volume (vol) to enable concentration.";
        }

    } else {
        requiredVolume.textContent = "—";
        requiredVolumeNote.textContent = "Enter desired dose to calculate withdrawal volume.";
    }


    // --- Patient rows live calc ---
    (() => {
        const volURL = parseFloat(qs.get("vol"));
        const canCalc = isFinite(volURL) && volURL > 0;



        // Skip if no patient rows
        if (!patients.length) return;

        const calLocal = parseLocalDatetime(calTime.value);

        patients.forEach((p, i) => {
            const cell = document.getElementById(`volCell-${i}`);
            if (!cell) return;

            if (patients[i]?.locked) {
                freezeRowIfLocked(i);
                return;
            }
            if (!canCalc) {
                cell.textContent = "—";
                return;
            }

            // activity at the *patient injection time*
            const injDate = dateWithHHMM(calLocal, p.timeHHMM);
            const dtMinPatient = minutesBetween(calLocal, injDate); // signed
            const aAtInj_MBq = decay(a0_MBq, dtMinPatient, t12);    // MBq in vial at inj time

            const concAtInj_MBq_per_mL = aAtInj_MBq / volURL;       // MBq/mL at inj time

            // convert patient’s entered dose to MBq using the per-patient dose unit selector
            const doseEntered = parseFloat(p.dose);
            if (!isFinite(doseEntered) || doseEntered <= 0 || !isFinite(concAtInj_MBq_per_mL) || concAtInj_MBq_per_mL <= 0) {
                cell.textContent = "—";
                return;
            }

            const doseMBq = (doseUnit.value === "mCi") ? doseEntered * MBQ_PER_MCI : doseEntered;
            const mlNeeded = doseMBq / concAtInj_MBq_per_mL;

            cell.textContent = fmt(mlNeeded, 1) + " mL";
        });
        // ensure locked rows keep frozen values
        patients.forEach((_, i) => freezeRowIfLocked(i));

    })();

    // --- Total volume / Remaining summary ---
    (() => {
        const volURL = parseFloat(qs.get("vol"));
        if (!patients.length || !isFinite(volURL) || volURL <= 0) {
            el("totalUsedVol").textContent = "Total Used: —";
            el("remainingVol").textContent = "Remaining: —";
            return;
        }

        let sum = 0;
        patients.forEach((p, i) => {
            const cell = document.getElementById(`volCell-${i}`);
            if (!cell) return;
            const v = parseFloat(cell.textContent);
            if (isFinite(v)) sum += v;
        });

        const remaining = volURL - sum;

        el("totalUsedVol").textContent = `Total Used: ${fmt(sum, 1)} mL`;
        el("remainingVol").textContent = `Remaining: ${fmt(remaining, 1)} mL`;
    })();

    // Elapsed Time display
    const days = Math.floor(tAbs / (60 * 24));
    const hours = Math.floor((tAbs - days * 60 * 24) / 60);
    const mins = Math.floor(tAbs - days * 60 * 24 - hours * 60);

    const signWord = isPre ? "until calibration" : "since calibration";
    const parts = [];
    if (days) parts.push(`${days} d`);
    if (hours) parts.push(`${hours} h`);
    parts.push(`${mins} min`);
    elapsed.textContent = `${parts.join(" ")} ${signWord}`;
    elapsedExact.textContent = `${fmt(dtMin, 1)} minutes (signed)`;

    const lambda = Math.log(2) / t12;
    const factor = Math.exp(-lambda * dtMin);
    decayFactor.textContent = `× ${fmt(factor, 4)}`;

    classifyBox(isPre);
}

// Boot sequence
populateIsotopes();
setDefaults();
seedFromCount();
renderPatients();
attachHandlers();
recalcOnce();

