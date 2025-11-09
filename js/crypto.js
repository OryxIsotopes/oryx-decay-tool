// ---------- crypto.js (AES-CBC 256-bit compatible with .NET) ----------

try {
    if (typeof window.ENCRYPTION_KEY_B64 !== "undefined" && window.ENCRYPTION_KEY_B64) {
        window.ENCRYPTION_KEY_B64URL = window.ENCRYPTION_KEY_B64
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
       
    } else {
        throw new Error("❌ ENCRYPTION_KEY_B64 not defined in config.js");
    }
} catch (e) {
    console.error(e);
}

const encTd = new TextEncoder();
const encTe = new TextDecoder();

// ---------- Helpers ----------
function toBase64Url(bytes) {
    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

function fromBase64Url(b64url) {
    let s = b64url.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

async function getCryptoKey() {
    const keyB64 = window.ENCRYPTION_KEY_B64;
    const keyBytes = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));
    return crypto.subtle.importKey("raw", keyBytes, { name: "AES-CBC" }, false, ["encrypt", "decrypt"]);
}

// ---------- ENCRYPT ----------
async function encryptData(obj) {
    const json = JSON.stringify(obj);
    const data = encTd.encode(json);

    // 16-byte IV (same as C#)
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const key = await getCryptoKey();

    const ctBuf = await crypto.subtle.encrypt({ name: "AES-CBC", iv }, key, data);
    const ct = new Uint8Array(ctBuf);

    // iv || ciphertext (same format as C#)
    const blob = new Uint8Array(iv.length + ct.length);
    blob.set(iv, 0);
    blob.set(ct, iv.length);

    return toBase64Url(blob);
}

// ---------- DECRYPT ----------
async function decryptData(tokenB64url) {
    const blob = fromBase64Url(tokenB64url);
    if (blob.length < 16) throw new Error("token too short");

    const iv = blob.slice(0, 16);
    const ct = blob.slice(16);

    const key = await getCryptoKey();
    const plainBuf = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, key, ct);

    const jsonStr = encTe.decode(plainBuf);
    return JSON.parse(jsonStr);
}
