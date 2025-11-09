// ---------- UI helpers ----------

function chip(text) {
    const span = document.createElement("span");
    span.className = "chip";
    span.textContent = text;
    return span;
}

function classifyBox(isPreCalibration) {
    const activityNowBox = el("activityNowBox");
    activityNowBox.classList.remove("ok", "warn");
    activityNowBox.classList.add(isPreCalibration ? "warn" : "ok");
}

function updateRemainingDisplay(expDate) {
    const now = new Date();
    const diffMs = expDate - now;
    const diffMin = Math.floor(diffMs / 60000);
    const absMin = Math.abs(diffMin);
    const hours = Math.floor(absMin / 60);
    const mins = absMin % 60;
    const remainingLabel = el("remainingLabel");

    if (diffMs > 0) {
        remainingLabel.textContent = `${hours}h ${mins}m remaining`;
        remainingLabel.style.color = "var(--ok)";
    } else {
        remainingLabel.textContent = "Expired";
        remainingLabel.style.color = "var(--err)";
    }
}
