// ---------- Utility & Time Functions ----------

const el = (id) => document.getElementById(id);

function fmt(num, digits = 3) {
    if (!isFinite(num)) return "—";
    if (num === 0) return "0";
    const abs = Math.abs(num);
    if (abs >= 1e6 || abs < 1e-3) return num.toExponential(digits);
    return num.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function parseLocalDatetime(dtLocalValue) {
    if (!dtLocalValue) return null;
    const [date, time] = dtLocalValue.split("T");
    if (!date || !time) return null;
    const [y, m, d] = date.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    return new Date(y, (m - 1), d, hh, mm, 0, 0);
}



function minutesBetween(a, b) {
    return (b.getTime() - a.getTime()) / 60000;
}

function decay(a0, tMin, t12min) {
    const ln2 = Math.log(2);
    return a0 * Math.exp(-ln2 * (tMin / t12min));
}

function normalizeToLocal(v) {
    const d = (v instanceof Date) ? v : new Date(v);
    if (Number.isNaN(+d)) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

function convertToMBq(value, fromUnit) {
    return (fromUnit === "mCi") ? value * MBQ_PER_MCI : value;
}
function convertFromMBq(valueMBq, toUnit) {
    return (toUnit === "mCi") ? (valueMBq / MBQ_PER_MCI) : valueMBq;
}


function currentParams() {
    const isotope = el("isotope");
    const halfLife = el("halfLife");
    const activity0 = el("activity0");
    const unit = el("unit");
    const calTime = el("calTime");

    const iso = isotope?.value || "";
    const t12 = parseFloat(halfLife?.value) || NaN;
    const a0 = parseFloat(activity0?.value) || NaN;
    const un = unit?.value || "MBq";
    const cal = parseLocalDatetime(calTime?.value);

    return { iso, t12, a0, un, cal };
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
