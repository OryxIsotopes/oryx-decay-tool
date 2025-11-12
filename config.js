


window.__keyReady = (async () => {
    try {
        const res = await fetch(
            "https://script.google.com/macros/s/AKfycbwZgjeIgWqhGej6jn9SpTICENRIb8d26H3YjKa8uwHMlz6dSoAop5LqN5ssiZj3HuB9zw/exec?apikey=ORYX_SECURE_2025"
        );
        if (!res.ok) throw new Error("Unauthorized");
        window.ENCRYPTION_KEY_B64 = await res.text();
        //console.log("✅ Encryption key loaded securely");
    } catch (err) {
       console.error("❌ Failed:", err);
    }
})();