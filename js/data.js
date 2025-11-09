
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

const MBQ_PER_MCI = 37.0;
