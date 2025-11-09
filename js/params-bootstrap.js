// ---------- params-bootstrap.js ----------
// Produces a global `qs` (URLSearchParams) decrypted from ?token= or #enc= links.
// Decrypted values are stored only in memory — never shown in the URL bar.


(function () {
    // --- Base64URL helpers ---
    function b64urlToBytes(b64url) {
        let s = b64url.replace(/-/g, "+").replace(/_/g, "/");
        while (s.length % 4) s += "=";
        return Uint8Array.from(atob(s), c => c.charCodeAt(0));
    }

    function bytesToStr(bytes) {
        return new TextDecoder().decode(bytes);
    }

    // --- AES-CBC decryption ---
    async function decryptCbcToken(tokenB64url, keyB64) {
        const blob = b64urlToBytes(tokenB64url);
        if (blob.length < 16) throw new Error("token too short");

        const iv = blob.slice(0, 16);
        const ciphertext = blob.slice(16);

        // Import raw 256-bit key
        const keyBytes = b64urlToBytes(keyB64
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, ""));
        const cryptoKey = await crypto.subtle.importKey(
            "raw", keyBytes, { name: "AES-CBC" }, false, ["decrypt"]
        );

        const plainBuf = await crypto.subtle.decrypt(
            { name: "AES-CBC", iv },
            cryptoKey,
            ciphertext
        );
        return JSON.parse(bytesToStr(new Uint8Array(plainBuf)));
    }

    // --- Convert object to URLSearchParams ---
    function objToParams(obj) {
        const p = new URLSearchParams();
        for (const [k, v] of Object.entries(obj || {}))
            if (v != null) p.set(k, String(v));
        return p;
    }

    // --- Initialization ---
    async function initQs() {
        const search = new URLSearchParams(location.search);
        const hash = location.hash;

        const encToken =
            search.get("token") ||
            (hash.startsWith("#enc=") ? decodeURIComponent(hash.substring(5)) : null);
        if (!encToken) return search; // plain query

        try {
            // ✅ Load AES key from config.js
            const keyB64 = window.ENCRYPTION_KEY_B64;
            if (!keyB64) throw new Error("ENCRYPTION_KEY_B64 missing in config.js");

            const payload = await decryptCbcToken(encToken, keyB64);
            const decrypted = objToParams(payload);

            // Store only in memory
            window.__decryptedParams = decrypted;

        

            return decrypted;
        } catch (err) {
            console.error("❌ decryption failed:", err);
            return search;
        }
    }

    window.__initQsPromise = initQs().then(p => (window.qs = p));
})();
