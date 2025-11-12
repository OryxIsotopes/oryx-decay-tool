// ---------- Main App Bootstrap ----------

// main.js

function showOverlayMessage(title, message, type = "info") {
    const overlay = document.getElementById("expiredOverlay");
    const wrap = document.querySelector(".wrap");
    if (!overlay) return;
    // 🔒 Never hide overlay if expired
    window.__expiredLock = type === "error" && title.includes("Expired");
    const color =
        type === "error"
            ? "var(--err)"
            : type === "ok"
                ? "var(--ok)"
                : "var(--fg)";


    overlay.style.display = "flex";
    if (wrap) wrap.style.display = "none";

    overlay.innerHTML = `
        <a href="https://www.oryxisotopes.com" target="_blank" rel="noopener" class="logo-link">
            <img src="images/ORYX-LOGO-FINAL-CUT-ai.png" alt="Oryx Isotopes Logo" class="logo fade-in" />
        </a>
        <h1 style="font-size:2rem; color:${color};">${title}</h1>
        <p style="color:var(--muted); font-size:1.1rem; max-width:480px;">${message}</p>
        <p style="margin-top:1rem; font-size:0.9rem; color:var(--muted); max-width:500px;">
            For assistance, contact <strong>Mohsen Alnajrani</strong> –
            <a href="mailto:m.alnajrani@oryxisotopes.com" style="color:inherit;text-decoration:underline;">
                m.alnajrani@oryxisotopes.com
            </a>
        </p>
        <small style="margin-top:2rem; font-size:0.8rem; color:var(--muted);">
            © ${new Date().getFullYear()} Mohsen Alnajrani – Oryx Isotopes Industrial Co.<br>
            Data collected may be used for internal quality assurance and regulatory documentation.
        </small>
    `;
}





function planStartDate() {
    const cal = parseLocalDatetime(el("calTime").value);
    const ps = el("planStart").value;
    if (!ps) return cal;
    return dateWithHHMM(cal, ps);
}



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
    const isoEl = el("isotope");
    const hlEl = el("halfLife");
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
    // --- Expiry Handling ---
    // --- Expiry & Loading Handling ---
    const overlay = el("expiredOverlay");
    const wrap = document.querySelector(".wrap");
    if (overlay && wrap) {
        if (!window.__expiredLock) {
            overlay.style.display = "none";
            wrap.style.display = "block";
        }

    }

    // Create a reusable function to show overlay messages
    function showOverlay(title, message, type = "info") {
        overlay.style.display = "flex";
        wrap.style.display = "none";
        overlay.innerHTML = `
        <a href="https://www.oryxisotopes.com" target="_blank" rel="noopener" class="logo-link">
            <img src="images/ORYX-LOGO-FINAL-CUT-ai.png" alt="Oryx Isotopes Logo" class="logo fade-in" />
        </a>
        <h1 style="font-size:2rem; color:var(--${type === 'error' ? 'err' : type === 'ok' ? 'ok' : 'muted'});">
            ${title}
        </h1>
        <p style="color:var(--muted); font-size:1.1rem; max-width:480px;">${message}</p>
    `;
    }

    // --- Loading state (shown immediately until data ready) ---
    showOverlay("⏳ Loading batch information…", "Please wait while the calculator initializes.");

    // Wait until parameters are loaded
    window.__initQsPromise?.then(() => {
        // Hide loading once parameters are ready
        if (!window.__expiredLock) {
            overlay.style.display = "none";
            wrap.style.display = "block";
        }


        // --- Handle expiry ---
        // --- Handle expiry (from QR code) ---
        if (!qs.has("exp")) {
            showOverlayMessage(
                "ℹ️ No Expiry Time Available",
                "This batch does not include an expiry date. Please verify with production records.",
                "info"
            );
            return;
        }

        let expStr = decodeURIComponent(qs.get("exp") || "").trim();
        expStr = expStr.replace("%3A", ":").replace(" ", "T");

        // Parse expiry
        let expDate;
        const match = expStr.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})$/);
        if (match) {
            const [_, y, mo, d, h, mi] = match.map(Number);
            expDate = new Date(y, mo - 1, d, h, mi);
        } else {
            expDate = new Date(expStr);
        }

        if (isNaN(expDate)) {
            showOverlayMessage(
                "⚠️ Invalid Expiry Time",
                "The expiry date format could not be read. Please check your data source.",
                "error"
            );
            return;
        }

        // --- Display Expiry on Screen ---
        const pad = n => String(n).padStart(2, "0");
        el("expLabel").textContent =
            `${pad(expDate.getDate())}/${pad(expDate.getMonth() + 1)}/${expDate.getFullYear()} ` +
            `${pad(expDate.getHours())}:${pad(expDate.getMinutes())}`;

        // --- Live Countdown + Expiry Auto Overlay ---
        function updateRemaining(initial = false) {
            const now = new Date();
            const diffMs = expDate - now;
            const diffMin = Math.floor(diffMs / 60000);
            const absMin = Math.abs(diffMin);
            const hours = Math.floor(absMin / 60);
            const mins = absMin % 60;

            if (diffMs > 0) {
                el("remainingLabel").textContent = `${hours}h ${mins}m remaining`;
                el("remainingLabel").style.color = "var(--ok)";
            } else {
                el("remainingLabel").textContent = `Expired ${hours}h ${mins}m ago`;
                el("remainingLabel").style.color = "var(--err)";

                // 🔥 Show overlay immediately, including on first load
                if (initial || !window.__expiryOverlayShown) {
                    showOverlayMessage(
                        "⚠️ This Batch Has Expired",
                        `Expired ${hours}h ${mins}m ago (${expDate.toLocaleString()})`,
                        "error"
                    );
                    window.__expiryOverlayShown = true;
                }

                clearInterval(expiryTimer);
                history.replaceState({}, "", location.pathname);
            }
        }

        const expiryTimer = setInterval(() => updateRemaining(false), 60000);
        updateRemaining(true);


    });






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
    //const shareBtn = el("shareLink");
    // Inside the same input handler:



    // --- Isotope & core inputs ---
    isotope.addEventListener("change", () => {
        if (isotope.value !== "__custom__")
            halfLife.value = HALF_LIVES_MIN[isotope.value];
        applyIsotopeHalfLife();
        recalcOnce();
    });

    [halfLife, activity0, calTime, targetDose, unit].forEach(elm => {
        elm.addEventListener("input", () => {
            recalcOnce();

            // 🔁 Keep Unit Label synchronized
            if (elm === unit) {
                el("unitLabel").textContent = unit.value;
            }
            // 🔁 Auto-save when Activity at Calibration changes
            if (elm === activity0 && typeof window.debouncedSave === "function") {
                window.debouncedSave("activity-calibration-edit");
            }
            if (elm === calTime && typeof window.debouncedSave === "function") {
                window.debouncedSave("calibration-time-edit");
            }

        });
    });

    // --- Desired dose change should update all unlocked patients
    el("targetDose").addEventListener("input", () => {
        const newDose = parseFloat(el("targetDose").value) || 0;
        if (!Array.isArray(window.patients)) return;
        window.patients.forEach(p => {
            if (!p.locked) p.dose = newDose;
        });
        renderPatients();
        recalcOnce();
    });

    recalcBtn.addEventListener("click", recalcOnce);

    // --- Interval change ---
    intervalMinEl.addEventListener("input", () => {
        if (!patients.length) return;
        respaceRespectingLocks();
        renderPatients();
        recalcOnce();
    });

    // --- Add patient ---
    addPatientBtn.addEventListener("click", () => {
        addNewPatient();
    });


    // --- Seed from count ---
    seedPatientsBtn.addEventListener("click", () => {
        seedFromCount();
        recalcOnce();
    });

    // --- Lock/unlock patient row ---
    // --- Lock/unlock patient row ---
    // --- Lock/unlock patient row ---
    patientsBody.addEventListener("input", (e) => {
        const tr = e.target.closest("tr");
        if (!tr) return;
        const idx = parseInt(tr.dataset.idx, 10);
        if (isNaN(idx)) return;

        const p = patients[idx];
        if (!p) return;

        if (e.target.classList.contains("timeInput")) {
            p.timeHHMM = e.target.value;
        } else if (e.target.classList.contains("doseInput")) {
            p.dose = parseFloat(e.target.value) || 0;
        }

        recalcOnce(); // 💡 Instant recalculation for live volume
    });

    // ✅ NEW: Plan start change reflows and recalculates
    el("planStart").addEventListener("input", () => {
        if (!Array.isArray(window.patients) || !window.patients.length) return;

        const start = planStartDate();
        const interval = parseFloat(el("intervalMin").value) || 0;
        let cursor = new Date(start.getTime());

        window.patients.forEach((p, i) => {
            if (p.locked) {
                // skip locked but advance cursor from last locked
                const lockedDate = dateWithHHMM(start, p.timeHHMM);
                cursor = addMinutes(lockedDate, interval);
            } else {
                p.timeHHMM = hhmmFromDate(cursor);
                cursor = addMinutes(cursor, interval);
            }
        });

        renderPatients();
        recalcOnce();
    });

    // ✅ NEW: Per-patient live dose/time edits
    patientsBody.addEventListener("input", (e) => {
        const tr = e.target.closest("tr");
        if (!tr) return;

        const idx = parseInt(tr.dataset.idx, 10);
        if (isNaN(idx)) return;

        const p = patients[idx];
        if (!p) return;

        // Update patient memory
        if (e.target.classList.contains("timeInput")) {
            p.timeHHMM = e.target.value;
        } else if (e.target.classList.contains("doseInput")) {
            p.dose = parseFloat(e.target.value) || 0;
        }

        // 🔁 Immediate update for volume in this row
        recalcOnce();
    });



    // --- Share secure link ---
   // shareBtn.addEventListener("click", async () => {
   //    const { iso, t12, a0, un, cal } = currentParams();
   //    const params = {
   //        iso, t12, a0, un,
   //        cal, exp: qs.get("exp"),
   //        cust: qs.get("cust"),
   //        doses: qs.get("doses"),
   //        vol: qs.get("vol"),
   //        batch: qs.get("batch")
   //    };
   //
   //    const encrypted = await encryptData(params);
   //    const url = `${location.origin}${location.pathname}#enc=${encodeURIComponent(encrypted)}`;
   //
   //    try {
   //        await navigator.clipboard.writeText(url);
   //        shareBtn.textContent = "Link Copied ✓";
   //        setTimeout(() => (shareBtn.textContent = "Copy Secure Link"), 1400);
   //    } catch {
   //        prompt("Copy this secure link:", url);
   //    }
   //});
   //
    // --- Continuous refresh ---
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
    let vol = parseFloat(el("volLabel").textContent);
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

        if (isFinite(concMBqperML) && concMBqperML > 0) {
            const mlNeeded = doseMBq / concMBqperML; // mL required NOW
            const overdraw = mlNeeded > vol; // compare with total available volume

            if (overdraw) {
                requiredVolume.textContent = `${fmt(mlNeeded, 1)} mL ⚠️`;
                requiredVolume.style.color = "var(--err)";
                requiredVolumeNote.textContent = `Requested volume (${fmt(mlNeeded, 1)} mL) exceeds total available volume (${fmt(vol, 1)} mL).`;
                requiredVolumeNote.style.color = "var(--err)";
            } else if (mlNeeded > 10) {
                // ⚠️ Within total but exceeds 10 mL limit
                requiredVolume.textContent = `${fmt(mlNeeded, 1)} mL ⚠️`;
                requiredVolume.style.color = "var(--warn)";
                requiredVolumeNote.textContent =
                    `Required volume (${fmt(mlNeeded, 1)} mL) exceeds the recommended maximum of 10 mL.`;
                requiredVolumeNote.style.color = "var(--warn)";
            } else {
                requiredVolume.textContent = `${fmt(mlNeeded, 1)} mL`;
                requiredVolume.style.color = "var(--fg)";
                requiredVolumeNote.textContent = `Based on ${fmt(concMBqperML, 1)} MBq/mL concentration.`;
                requiredVolumeNote.style.color = "var(--muted)";
            }

        } else {
            requiredVolume.textContent = "—";
            requiredVolumeNote.textContent = "Set volume (vol) to enable concentration.";
            requiredVolume.style.color = "var(--muted)";
            requiredVolumeNote.style.color = "var(--muted)";
        }

    } else {
        requiredVolume.textContent = "—";
        requiredVolumeNote.textContent = "Enter desired dose to calculate withdrawal volume.";
        requiredVolume.style.color = "var(--muted)";
        requiredVolumeNote.style.color = "var(--muted)";
    }



    // --- Patient rows live calc ---
    // --- Patient rows live calc ---
    (() => {
        const volURL = parseFloat(el("volLabel").textContent);
        const canCalc = isFinite(volURL) && volURL > 0;

        if (!Array.isArray(patients) || !patients.length) return;

        const calLocal = parseLocalDatetime(calTime.value);

        // ✅ sync live input values to memory before calculating
        patients.forEach((p, i) => {
            const tr = document.querySelector(`#patientsBody tr[data-idx="${i}"]`);
            if (!tr) return;
            const t = tr.querySelector(".timeInput")?.value;
            const d = parseFloat(tr.querySelector(".doseInput")?.value);
            if (t) p.timeHHMM = t;
            if (!isNaN(d)) p.dose = d;

            const cell = document.getElementById(`volCell-${i}`);
            if (!cell) return;

            if (p.locked) {
                freezeRowIfLocked(i);
                return;
            }

            if (!canCalc) {
                cell.textContent = "—";
                cell.style.color = "var(--muted)";
                return;
            }

            const injDate = dateWithHHMM(calLocal, p.timeHHMM);
            const dtMinPatient = minutesBetween(calLocal, injDate);
            const aAtInj_MBq = decay(a0_MBq, dtMinPatient, t12);
            const concAtInj_MBq_per_mL = aAtInj_MBq / volURL;

            const doseEntered = parseFloat(p.dose);
            if (
                !isFinite(doseEntered) ||
                doseEntered <= 0 ||
                !isFinite(concAtInj_MBq_per_mL) ||
                concAtInj_MBq_per_mL <= 0
            ) {
                cell.textContent = "—";
                cell.style.color = "var(--muted)";
                return;
            }

            const doseMBq =
                doseUnit.value === "mCi" ? doseEntered * MBQ_PER_MCI : doseEntered;
            const mlNeeded = doseMBq / concAtInj_MBq_per_mL;

            // ⚠️ New logic: compare with total available volume
            if (mlNeeded > volURL) {
                cell.textContent = `${fmt(mlNeeded, 1)} mL ⚠️`;
                cell.style.color = "var(--err)";
                cell.title = `Required volume (${fmt(
                    mlNeeded,
                    1
                )} mL) exceeds total available volume (${fmt(volURL, 1)} mL).`;
            }
         else if (mlNeeded > 10) {
            // Case 2: Within total but exceeds 10 mL allowed limit
            cell.textContent = `${fmt(mlNeeded, 1)} mL ⚠️`;
            cell.style.color = "var(--warn)";
            cell.title = `Required volume (${fmt(mlNeeded, 1)} mL) exceeds recommended maximum of 10 mL.`;
        }
            else {
                cell.textContent = `${fmt(mlNeeded, 1)} mL`;
                cell.style.color = "var(--fg)";
                cell.title = "";
            }

            // ✅ Save calculated volume back to memory for Firestore sync
            p.volumeRequired = `${fmt(mlNeeded, 1)} mL`;
        });

        // ensure locked rows keep frozen values
        patients.forEach((_, i) => freezeRowIfLocked(i));
    })();



    // --- Total volume / Remaining summary ---
    (() => {
        const volURL = parseFloat(el("volLabel").textContent);

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
function debounce(fn, delay = 1000) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

 // ---------- Firestore Auto-Update Sync ----------
 // ---------- Firestore Integration (retrieve or create + full sync) ----------
 // ---------- Firestore Integration (retrieve, merge, update) ----------
 // ---------- Main App Bootstrap ----------
 (async () => {
     console.log("⏳ Waiting for key, query, and Firestore initialization...");
 
     // --- Wait for dependencies ---
     if (window.__keyReady) await window.__keyReady;
     if (window.__initQsPromise) await window.__initQsPromise;
     let retries = 0;
     while (!window.__fsReady && retries < 200) {
         await new Promise(r => setTimeout(r, 25));
         retries++;
     }
     if (!window.__fsReady) {
         console.error("Firestore initialization timeout — continuing offline mode");
     }
 
 
     // --- Ensure query params exist ---
     const qs = window.qs || window.__decryptedParams || new URLSearchParams(location.search);
     window.qs = qs;
 
     const FS = window.OryxFS;
     const customer = qs.get("cust")?.trim() || "";
     const batch = qs.get("batch")?.trim() || "";
     if (!customer || !batch) {
         console.error("⚠️ Missing required identifiers (cust, batch)");
         showOverlayMessage(
             "⚠️ Missing Batch Information",
             "No valid batch or customer information was found in the link. Please verify your QR code or secure link.",
             "error"
         );
         return;
     }

 
     console.log("✅ Initialization complete — starting app...");
     await FS.ensureCustomer(customer);
 
     // --- Core helper to collect data ---
     const collectData = () => ({
         customer,
         batch_no: batch,
         isotope: el("isotope")?.value || qs.get("iso") || "F-18",
         unit: el("unit")?.value || qs.get("unit") || "mCi",
         calibration_time: el("calTime")?.value || qs.get("cal") || "",
         expiry_time: qs.get("exp") || "",
         activity_initial: parseFloat(el("activity0")?.value || 0),
         activity_now: el("activityNow")?.textContent || "",
         concentration_now: el("concentrationNow")?.textContent || "",
         volume: parseFloat(el("volLabel")?.textContent || 0),
         doses: parseFloat(el("dosesLabel")?.textContent || 0),
         interval_min: parseFloat(el("intervalMin")?.value || 0),
         plan_start: el("planStart")?.value || "",
         desired_dose: parseFloat(el("targetDose")?.value || 0),
         dose_unit: el("doseUnit")?.value || el("unit")?.value || "mCi",
 
         // 🧍 Patients (safe extraction)
         patients: (() => {
             const domRows = Array.from(document.querySelectorAll("#patientsBody tr"));
             if (domRows.length === 0 && Array.isArray(window.patients)) {
                 // Fallback when no DOM rows are rendered yet
                 return window.patients.map((p, i) => ({
                     index: i + 1,
                     timeHHMM: p.timeHHMM || "",
                     dose: parseFloat(p.dose) || 0,
                     locked: !!p.locked,
                     lockedMl: p.lockedMl || "",
                     volumeRequired: p.volumeRequired || ""
                 }));
             }
 
             // Extract live from DOM + memory
             return domRows.map((tr, i) => {
                 const idx = parseInt(tr.dataset.idx ?? i, 10);
                 const p = window.patients?.[idx] || {};
                 const volCell = document.getElementById(`volCell-${idx}`);
                 const timeInput = tr.querySelector(".timeInput");
                 const doseInput = tr.querySelector(".doseInput");
 
                 return {
                     index: idx + 1,
                     timeHHMM: timeInput?.value || p.timeHHMM || "",
                     dose: parseFloat(doseInput?.value ?? p.dose ?? 0) || 0,
                     locked: !!p.locked,
                     lockedMl: p.lockedMl || "",
                     volumeRequired: volCell ? volCell.textContent.trim() : ""
                 };
             });
         })(),
 
         updated_at: new Date().toISOString()
     });
 
     // --- Load or Create Firestore record ---
     const latest = await FS.readLatestLog(customer, batch);
 
     populateIsotopes();
     applyIsotopeHalfLife();
     attachHandlers();
     if (!window.patients) window.patients = [];
 
 
     if (latest) {
         console.log("📦 Existing batch found:", latest);
 
         // Restore metadata fields
         if (latest.isotope) el("isotope").value = latest.isotope;
         applyIsotopeHalfLife();
 
         if (latest.unit) el("unit").value = latest.unit;
         if (latest.unit) el("unitLabel").textContent = latest.unit;
         if (latest.calibration_time) el("calTime").value = normalizeToLocal(latest.calibration_time);
         if (typeof latest.activity_initial === "number") el("activity0").value = latest.activity_initial;
         if (latest.desired_dose) el("targetDose").value = latest.desired_dose;
         if (latest.dose_unit) el("doseUnit").value = latest.dose_unit;
         if (latest.plan_start) el("planStart").value = latest.plan_start;
         if (typeof latest.volume === "number") el("volLabel").textContent = latest.volume;
         if (typeof latest.doses === "number") el("dosesLabel").textContent = latest.doses;
         if (latest.interval_min) el("intervalMin").value = latest.interval_min;
         // --- Ensure UI labels and expiry restored properly ---
         if (latest.customer) el("custLabel").textContent = latest.customer;
         if (latest.batch_no) el("batchLabel").textContent = latest.batch_no;

         // --- Restore expiry handling ---
         // --- Restore expiry handling (with live overlay sync) ---
         if (latest.expiry_time) {
             let expStr = decodeURIComponent(latest.expiry_time || "").trim();
             expStr = expStr.replace("%3A", ":").replace(" ", "T");
             const expDate = new Date(expStr);

             if (!isNaN(expDate)) {
                 const pad = n => String(n).padStart(2, "0");
                 el("expLabel").textContent =
                     `${pad(expDate.getDate())}/${pad(expDate.getMonth() + 1)}/${expDate.getFullYear()} ` +
                     `${pad(expDate.getHours())}:${pad(expDate.getMinutes())}`;

                 // 🕒 Live update + automatic overlay if expired
                 function updateRemaining() {
                     const now = new Date();
                     const diffMs = expDate - now;
                     const diffMin = Math.floor(diffMs / 60000);
                     const absMin = Math.abs(diffMin);
                     const hours = Math.floor(absMin / 60);
                     const mins = absMin % 60;

                     if (diffMs > 0) {
                         // ✅ Still valid
                         el("remainingLabel").textContent = `${hours}h ${mins}m remaining`;
                         el("remainingLabel").style.color = "var(--ok)";
                     } else {
                         // ❌ Expired now or already expired
                         showOverlayMessage(
                             "⚠️ This Batch Has Expired",
                             `Expired ${hours}h ${mins}m ago (${expDate.toLocaleString()})`,
                             "error"
                         );
                         el("remainingLabel").textContent = `Expired ${hours}h ${mins}m ago`;
                         el("remainingLabel").style.color = "var(--err)";
                         clearInterval(expiryTimer);
                         history.replaceState({}, "", location.pathname);
                     }
                 }

                 const expiryTimer = setInterval(updateRemaining, 60000);
                 updateRemaining(); // run immediately
             } else {
                 showOverlayMessage(
                     "⚠️ Invalid Expiry Time",
                     "The expiry time in the saved batch record is not readable.",
                     "error"
                 );
             }
         } else {
             showOverlayMessage(
                 "ℹ️ No Expiry Time Available",
                 "This batch does not contain expiry information in its database record.",
                 "info"
             );
         }

 
         // Restore patients (with fallbacks for time/dose)
         if (Array.isArray(latest.patients) && latest.patients.length > 0) {
             const base = el("planStart").value || hhmmFromDate(planStartDate());
             const interval = parseFloat(el("intervalMin").value) || 0;
 
             window.patients = latest.patients.map((p, i) => ({
                 timeHHMM: p.timeHHMM?.trim() || addMinutesHHMM(base, i * interval),
                 dose: Number.isFinite(parseFloat(p.dose)) ? parseFloat(p.dose) : 0,
                 locked: !!p.locked,
                 lockedMl: p.lockedMl || "",
                 volumeRequired: p.volumeRequired || ""
             }));
 
             renderPatients();

             // Reapply locked visuals
             latest.patients.forEach((p, i) => {
                 const cell = document.getElementById(`volCell-${i}`);
                 if (cell && p.locked) cell.textContent = p.lockedMl || cell.textContent;
             });

             // 🧩 NEW: Force recalculation to update volumes
             // 🧩 Delay to ensure DOM ready, then trigger full recalculation
             await new Promise(r => setTimeout(r, 200));
             recalcOnce();

             // 🧩 Force refresh after Firestore restores all data
             setTimeout(() => recalcOnce(), 500);


             console.log(`✅ Restored ${latest.patients.length} patients`);

         } else {
             // 🧩 If no patient data in Firestore but doses exist → auto seed
             const doseCount = parseInt(el("dosesLabel").textContent) || 0;
             if (doseCount > 0) {
                 seedFromCount();
                 console.log(`🆕 Auto-seeded ${doseCount} patients`);
             } else {
                 window.patients = [];
             }
         }
 
         // ✅ Ensure main UI visible and overlay hidden after Firestore load
         const overlay = el("expiredOverlay");
         const wrap = document.querySelector(".wrap");
         if (overlay && wrap) {
             if (!window.__expiredLock) {
                 overlay.style.display = "none";
                 wrap.style.display = "block";
             }

         }
 
     } else {
         console.log("🆕 Creating new batch record...");
         if (!latest) {
             console.warn("⚠️ No existing batch log found in Firestore.");
             showOverlayMessage(
                 "ℹ️ No Batch Data Available",
                 `No previous data was found for batch <strong>${batch}</strong> under customer <strong>${customer}</strong>. A new record will be created once data is entered.`,
                 "info"
             );
         }

         setDefaults(); // Only apply defaults for new batches
         const data = collectData();
         data.updated_by = "calculator-init";
         data.created_at = data.updated_at;
         await FS.ensureBatch(customer, batch, data);
         await FS.upsertBatchMeta(customer, batch, data);
         await FS.addLog(customer, batch, data);
         // ✅ Hide overlay and initialize empty patient list
         window.patients = [];
         renderPatients();
         // 🧩 NEW: auto-seed if dose count exists
         const doseCount = parseInt(el("dosesLabel").textContent) || 0;
         if (doseCount > 0) {
             seedFromCount();
             console.log(`🆕 Auto-seeded ${doseCount} patients`);
         }
         // Recalculate after rendering so volumes appear
         await new Promise(r => setTimeout(r, 50)); // small delay ensures DOM ready
         recalcOnce();


 
         const overlay = el("expiredOverlay");
         const wrap = document.querySelector(".wrap");
         if (overlay && wrap) {
             if (!window.__expiredLock) {
                 overlay.style.display = "none";
                 wrap.style.display = "block";
             }

         }
 
     }
 
     // --- Save hooks ---
     async function pushFullUpdate(trigger) {
         const data = collectData();
         data.updated_by = trigger;
         await FS.addLog(customer, batch, data);
         await FS.upsertBatchMeta(customer, batch, data);
         console.log(`✅ Firestore full update (${trigger})`, data);
     }

     window.pushFullUpdate = pushFullUpdate;
     window.debouncedSave = debounce(pushFullUpdate, 1500);


 
     const manualBtn = document.createElement("button");
     manualBtn.textContent = "💾 Save Full Log";
     manualBtn.className = "btn secondary";
     manualBtn.onclick = async () => {
         await pushFullUpdate("manual-save");
     };
     document
         .querySelector(".inputs .row:last-child .field")
         ?.appendChild(manualBtn);
 
     // --- Optional: auto-save when patient rows edited ---
     el("patientsBody").addEventListener(
         "input",
         debounce(() => pushFullUpdate("patient-edit"), 2000)
     );

     // ✅ Ensure at least one initial recalculation after page load
     setTimeout(() => {
         if (typeof recalcOnce === "function") recalcOnce();
     }, 200);

 
     console.log("📡 Firestore sync ready for", customer, batch);
 })();
 



function addMinutesHHMM(hhmm, addMin) {
    const [h, m] = (hhmm || "00:00").split(":").map(n => parseInt(n, 10) || 0);
    const d = new Date(2000, 0, 1, h, m, 0, 0);
    d.setMinutes(d.getMinutes() + addMin);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
}






