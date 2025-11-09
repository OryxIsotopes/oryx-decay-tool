
        // ---------- Half-life dataset (minutes) ----------
        // Values chosen from widely used references; verify against IAEA LiveChart for your QA release.
        // You can add more isotopes as needed.
        const HALF_LIVES_MIN = {
            "F-18": 109.771,
            "Tc-99m": 360.0,            // 6.0 h
            "I-131": 192.5 * 60,        // ~8.02 d
            "Ga-68": 67.71,
            "Lu-177": 6.647 * 24 * 60,  // 6.647 d
            "Y-90": 64.1 * 60,          // 64.1 h
            "C-11": 20.334,
            "N-13": 9.97,
            "O-15": 2.036,
            "Zr-89": 78.41 * 60,        // 78.41 h
            "Cu-64": 12.701 * 60        // 12.701 h
        };

        const qs = new URLSearchParams(location.search);

        const el = (id) => document.getElementById(id);
        const isotope = el("isotope");
        const halfLife = el("halfLife");
        const activity0 = el("activity0");
        const unit = el("unit");
        const unitLabel = el("unitLabel");
        const calTime = el("calTime");
        const nowTime = el("nowTime");
        const recalcBtn = el("recalc");
        const shareBtn = el("shareLink");

        const statusChips = el("statusChips");
        const activityNow = el("activityNow");
        const activityNowAlt = el("activityNowAlt");
        const activityNowBox = el("activityNowBox");
        const concentrationNow = el("concentrationNow");
        const concentrationNowAlt = el("concentrationNowAlt");
        const concentrationNowBox = el("concentrationNowBox");

        const targetDose = el("targetDose");
        const doseUnitLabel = el("doseUnitLabel");
        const requiredVolume = el("requiredVolume");
        const requiredVolumeNote = el("requiredVolumeNote");


        const elapsed = el("elapsed");
        const elapsedExact = el("elapsedExact");
        const decayFactor = el("decayFactor");
        const doseUnit = el("doseUnit");

        const patientsBody = el("patientsBody");
        const intervalMinEl = el("intervalMin");
        const addPatientBtn = el("addPatient");
        const seedPatientsBtn = el("seedPatients");
        const perPatientDoseUnit = el("perPatientDoseUnit");

        // Each patient: { timeHHMM, dose, locked?: boolean, lockedMl?: string }

        let patients = [];



        const MBQ_PER_MCI = 37.0;

        // Populate isotope list
        function populateIsotopes() {
            isotope.innerHTML = "";
            const keys = Object.keys(HALF_LIVES_MIN).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
            for (const key of keys) {
                const opt = document.createElement("option");
                opt.value = key; opt.textContent = key;
                isotope.appendChild(opt);
            }
            // Add a "Custom…" option to allow arbitrary isotopes with manual T1/2
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
                console.log("📅 Expiry raw string:", expStr);
                console.log("🕓 Parsed expDate (local):", expDate.toString());
                console.log("🕐 Current time:", now.toString());
                console.log("⏳ Difference (ms):", diffMs);
                console.log("⏱ Difference (minutes):", diffMin);
                console.log("⏰ Difference (hours):", diffHr);

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
                    console.log("Now:", now.toString(), "DiffMs:", diffMs);

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

        function normalizeToLocal(v) {
            const d = (v instanceof Date) ? v : new Date(v);
            if (Number.isNaN(+d)) return "";
            const pad = (n) => String(n).padStart(2, "0");
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        }


        function chip(text) {
            const span = document.createElement("span");
            span.className = "chip"; span.textContent = text;
            return span;
        }

        function fmt(num, digits = 3) {
            if (!isFinite(num)) return "—";
            if (num === 0) return "0";
            const abs = Math.abs(num);
            if (abs >= 1e6 || abs < 1e-3) return num.toExponential(digits);
            return num.toLocaleString(undefined, { maximumFractionDigits: digits });
        }

        function parseLocalDatetime(dtLocalValue) {
            // Treat input value (YYYY-MM-DDTHH:MM) as local time
            if (!dtLocalValue) return null;
            const [date, time] = dtLocalValue.split("T");
            if (!date || !time) return null;
            const [y, m, d] = date.split("-").map(Number);
            const [hh, mm] = time.split(":").map(Number);
            return new Date(y, (m - 1), d, hh, mm, 0, 0);
        }

        function minutesBetween(a, b) {
            // b - a in minutes
            return (b.getTime() - a.getTime()) / 60000;
        }

        function decay(a0, tMin, t12min) {
            // A = A0 * exp(-ln2 * t / T1/2)
            const ln2 = Math.log(2);
            return a0 * Math.exp(-ln2 * (tMin / t12min));
        }

        function updateUnitLabel() {
            // convert target dose value automaically
            let dose = parseFloat(targetDose.value);
            if (isFinite(dose)) {
                if (unit.value === "mCi") {
                    // convert MBq → mCi
                    targetDose.value = (dose / MBQ_PER_MCI).toString();
                } else {
                    // convert mCi → MBq
                    targetDose.value = (dose * MBQ_PER_MCI).toString();
                }
            }
            unitLabel.textContent = unit.value;
            doseUnitLabel.textContent = unit.value;

        }

        function currentParams() {
            const iso = isotope.value === "__custom__" ? (qs.get("iso") || "Custom") : isotope.value;
            const t12 = parseFloat(halfLife.value);
            const a0 = parseFloat(activity0.value);
            const un = unit.value;
            const cal = parseLocalDatetime(calTime.value);
            return { iso, t12, a0, un, cal };
        }

        function convertToMBq(value, fromUnit) {
            return (fromUnit === "mCi") ? value * MBQ_PER_MCI : value;
        }
        function convertFromMBq(valueMBq, toUnit) {
            return (toUnit === "mCi") ? (valueMBq / MBQ_PER_MCI) : valueMBq;
        }

        function classifyBox(isPreCalibration) {
            activityNowBox.classList.remove("ok", "warn");
            activityNowBox.classList.add(isPreCalibration ? "warn" : "ok");
        }

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

        function toLocalISOWithOffset(date) {
            const tzo = -date.getTimezoneOffset();
            const dif = tzo >= 0 ? "+" : "-";
            const pad = (num) => String(Math.floor(Math.abs(num))).padStart(2, "0");
            return date.getFullYear() +
                "-" + pad(date.getMonth() + 1) +
                "-" + pad(date.getDate()) +
                "T" + pad(date.getHours()) +
                ":" + pad(date.getMinutes()) +
                ":" + pad(date.getSeconds()) +
                dif + pad(tzo / 60) +
                ":" + pad(tzo % 60);
        }


        function pad2(n) { return String(n).padStart(2, "0"); }

        function addMinutes(date, mins) {
            return new Date(date.getFullYear(), date.getMonth(), date.getDate(),
                date.getHours(), date.getMinutes() + mins, 0, 0);
        }

        function dateWithHHMM(baseDate, hhmm) {
            const [h, m] = hhmm.split(":").map(v => parseInt(v, 10));
            return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), h || 0, m || 0, 0, 0);
        }

        function hhmmFromDate(d) {
            return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
        }

        function respaceRespectingLocks() {
            // Re-space ONLY unlocked rows; keep locked rows fixed in time.
            const start = planStartDate();
            const step = parseInt(intervalMinEl.value, 10) || 20;

            // Cursor starts at plan start. As we walk in index order:
            // - If row is locked: move cursor to (lockedTime + step)
            // - If row is unlocked: set its time to cursor, advance cursor by step
            let cursor = new Date(start.getTime());

            for (let i = 0; i < patients.length; i++) {
                const p = patients[i];
                if (p.locked) {
                    // honor the locked time and advance the cursor after it
                    const lockedDate = dateWithHHMM(start, p.timeHHMM);
                    cursor = addMinutes(lockedDate, step);
                } else {
                    p.timeHHMM = hhmmFromDate(cursor);
                    cursor = addMinutes(cursor, step);
                }
            }
        }

        function freezeRowIfLocked(i) {
            // If row i is locked, keep its displayed ML exactly as stored
            const p = patients[i];
            const cell = document.getElementById(`volCell-${i}`);
            if (!p || !cell) return;
            if (p.locked) {
                // Show frozen value if we have it; otherwise keep current text
                cell.textContent = (typeof p.lockedMl === "string" && p.lockedMl.length)
                    ? p.lockedMl
                    : cell.textContent;
            }
        }


        function planStartDate() {
            const cal = parseLocalDatetime(calTime.value);
            const ps = el("planStart").value;
            if (!ps) return cal;
            return dateWithHHMM(cal, ps);
        }


        function renderPatients() {
            perPatientDoseUnit.textContent = doseUnit.value;

            patientsBody.innerHTML = "";
            patients.forEach((p, i) => {
                const locked = !!p.locked;
                const tr = document.createElement("tr");

                tr.innerHTML = `
          <td style="white-space:nowrap;">
            ${i + 1}
            <button class="btn secondary" data-action="toggle-lock" data-idx="${i}" style="margin-left:8px;padding:4px 8px;">
              ${locked ? "🔒" : "🔓"}
            </button>
          </td>
          <td>
            <input type="time" value="${p.timeHHMM}" data-idx="${i}" data-field="time" ${locked ? "disabled" : ""}/>
          </td>
          <td>
            <input type="number" min="0" step="0.001"
                   value="${isFinite(p.dose) ? p.dose : ""}"
                   data-idx="${i}" data-field="dose" style="max-width:140px;" ${locked ? "disabled" : ""}/>
            <span class="muted">${doseUnit.value}</span>
          </td>
          <td>
            <span id="volCell-${i}">—</span>
            ${locked ? `<span class="chip" style="margin-left:8px;">Locked</span>` : ""}
          </td>
        `;
                patientsBody.appendChild(tr);
            });
        }


        function seedFromCount() {
            const countFromUrl = parseInt(qs.get("doses"), 10);
            const n = Number.isInteger(countFromUrl) && countFromUrl > 0 ? countFromUrl : 1;
            const defaultDose = parseFloat(targetDose.value) || 0;

            // Keep all locked rows; drop all unlocked rows, then refill unlocked until length >= n
            const lockedRows = patients.filter(p => p.locked);
            patients = [...lockedRows];

            while (patients.length < n) {
                patients.push({ timeHHMM: hhmmFromDate(planStartDate()), dose: defaultDose, locked: false, lockedMl: "" });
            }
            // If patients.length > n because too many locked rows, we keep them (never delete locked).

            respaceRespectingLocks();
            renderPatients();
        }


        function attachHandlers() {
            isotope.addEventListener("change", () => {
                if (isotope.value === "__custom__") {
                    // keep user-entered half-life
                } else {
                    halfLife.value = HALF_LIVES_MIN[isotope.value];
                }
                recalcOnce();
            });
            halfLife.addEventListener("input", recalcOnce);
            activity0.addEventListener("input", recalcOnce);
            unit.addEventListener("change", () => { updateUnitLabel(); recalcOnce(); });
            calTime.addEventListener("change", recalcOnce);
            recalcBtn.addEventListener("click", recalcOnce);
            targetDose.addEventListener("input", recalcOnce);
            unit.addEventListener("change", () => { updateUnitLabel(); recalcOnce(); });

            doseUnit.addEventListener("change", recalcOnce);

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

            el("planStart").addEventListener("change", () => {
                if (!patients.length) return;
                respaceRespectingLocks();
                renderPatients();
                recalcOnce();

            });

            // delegate edits from table
            // Block edits to locked rows (already disabled, but guard anyway)
            patientsBody.addEventListener("input", (e) => {
                const t = e.target;
                const idx = parseInt(t.getAttribute("data-idx"), 10);
                const field = t.getAttribute("data-field");
                if (!Number.isInteger(idx) || !field) return;
                if (patients[idx]?.locked) return; // ignore edits for locked rows

                if (field === "time") {
                    patients[idx].timeHHMM = t.value;
                }
                if (field === "dose") {
                    patients[idx].dose = parseFloat(t.value) || 0;
                }

                recalcOnce();
            });


            // Handle lock/unlock button
            patientsBody.addEventListener("click", (e) => {
                const btn = e.target.closest('button[data-action="toggle-lock"]');
                if (!btn) return;
                const idx = parseInt(btn.getAttribute("data-idx"), 10);
                if (!Number.isInteger(idx) || !patients[idx]) return;

                const p = patients[idx];
                const cell = document.getElementById(`volCell-${idx}`);

                if (!p.locked) {
                    // Going to LOCK: snapshot current displayed mL (if any)
                    p.locked = true;
                    p.lockedMl = cell ? cell.textContent : "";
                } else {
                    // Going to UNLOCK: allow recomputation
                    p.locked = false;
                    p.lockedMl = "";
                }

                renderPatients();   // updates button label + disables inputs
                recalcOnce();       // recompute; freezeRowIfLocked will pin mL
            });


            targetDose.addEventListener("input", () => {
                // new rows added later will use this default; existing rows stay as edited
                recalcOnce();
            });
            doseUnit.addEventListener("change", () => {
                perPatientDoseUnit.textContent = doseUnit.value;
            });


            // keep header dose unit in sync with the selector you already added
            doseUnit.addEventListener("change", () => {
                renderPatients();
                recalcOnce();
            });


            shareBtn.addEventListener("click", async () => {
                const { iso, t12, a0, un, cal } = currentParams();
                const params = new URLSearchParams();

                // Core decay parameters
                params.set("iso", iso);
                if (isotope.value === "__custom__" && isFinite(t12)) {
                    params.set("t12min", String(t12));
                }

                if (isFinite(a0)) params.set("a0", String(a0));
                params.set("unit", un);

                // Calibration date (ISO 8601 local time with offset)
                if (cal) params.set("cal", toLocalISOWithOffset(cal));

                // --- Shipment / batch metadata ---
                if (qs.has("cust")) params.set("cust", qs.get("cust"));
                if (qs.has("doses")) params.set("doses", qs.get("doses"));
                if (qs.has("vol")) params.set("vol", qs.get("vol"));
                if (qs.has("batch")) params.set("batch", qs.get("batch"));
                if (qs.has("exp")) params.set("exp", qs.get("exp")); // expiry from QR
                if (targetDose.value && isFinite(parseFloat(targetDose.value))) {
                    params.set("dose", targetDose.value);
                }

                // --- Build final link ---
                const url = `${location.origin}${location.pathname}?${params.toString()}`;

                // --- Copy link to clipboard or show fallback ---
                try {
                    await navigator.clipboard.writeText(url);
                    shareBtn.textContent = "Link Copied ✓";
                    setTimeout(() => (shareBtn.textContent = "Copy Shareable Link"), 1400);
                } catch {
                    prompt("Copy this link:", url);
                }
            });



            // Live update every 1s
            setInterval(recalcOnce, 1000);
        }

        // Boot
        populateIsotopes();
        setDefaults();
        // After setDefaults();
        seedFromCount();
        renderPatients();

        attachHandlers();
        recalcOnce();
