// ==========================================
// SERVICETOOL - ADVISOR QUICK LOOKUP ENGINE
// ==========================================

let schedulesDB = {};

// Load schedule database on startup
async function loadSchedules() {
    try {
        const response = await fetch("./schedules.json");
        if (!response.ok) throw new Error("Could not load schedules.json");
        schedulesDB = await response.json();
    } catch (err) {
        console.error("Database load error:", err);
    }
}
loadSchedules();

// ==========================================
// DATE & AGE HELPER
// ==========================================
function calculateAge(inServiceDate) {
    const start = new Date(inServiceDate + "T00:00:00");
    const today = new Date();

    let years = today.getFullYear() - start.getFullYear();
    let months = today.getMonth() - start.getMonth();

    if (months < 0 || (months === 0 && today.getDate() < start.getDate())) {
        years--;
        months += 12;
    }

    const totalMonths = (years * 12) + months;
    return { years, months, totalMonths };
}

// ==========================================
// MAIN DECODE & CALCULATION FUNCTION
// ==========================================
async function decodeVehicle() {
    const vinInput = document.getElementById("vin");
    const mileageInput = document.getElementById("mileage");
    const dateInput = document.getElementById("inServiceDate");
    const resultContainer = document.getElementById("result");

    const vin = vinInput.value.trim().toUpperCase();
    const mileage = Number(mileageInput.value);
    const inServiceDate = dateInput.value;

    // Validation
    if (vin.length !== 17) {
        resultContainer.innerHTML = `<div class="card"><p style="color:var(--danger); font-weight:bold;">⚠️ Please enter a complete 17-character VIN.</p></div>`;
        return;
    }
    if (!mileage || mileage < 0) {
        resultContainer.innerHTML = `<div class="card"><p style="color:var(--danger); font-weight:bold;">⚠️ Please enter valid current mileage.</p></div>`;
        return;
    }
    if (!inServiceDate) {
        resultContainer.innerHTML = `<div class="card"><p style="color:var(--danger); font-weight:bold;">⚠️ Please select the in-service date.</p></div>`;
        return;
    }

    resultContainer.innerHTML = `<div class="card"><p>Querying NHTSA database and generating schedule...</p></div>`;

    try {
        // Fetch from NHTSA API
        const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`);
        if (!response.ok) throw new Error("API request failed.");
        const data = await response.json();

        if (!data.Results || data.Results.length === 0) {
            resultContainer.innerHTML = `<div class="card"><p>Vehicle not found. Check VIN.</p></div>`;
            return;
        }

        const v = data.Results[0];
        const make = (v.Make || "UNKNOWN").toUpperCase();
        const model = (v.Model || "UNKNOWN").toUpperCase();
        const year = v.ModelYear || "N/A";
        const engineDisplacement = v.DisplacementL ? parseFloat(v.DisplacementL).toFixed(1) : "2.0";
        const driveType = v.DriveType || "N/A";
        const fuel = v.FuelTypePrimary || "Gasoline";
        const transmission = v.TransmissionStyle || "Automatic";

        const age = calculateAge(inServiceDate);

        // Match Schedule: Make -> Model -> Engine displacement fallback -> DEFAULT
       // Smarter schedule matching for Alfa, Maserati, Fiat, or fallback:
let activeSchedule = [];

if (schedulesDB[make] && schedulesDB[make][model]) {
    const modelSchedules = schedulesDB[make][model];
    
    // 1. Exact engine match (e.g., "3.0", "1.4", "2.0")
    if (modelSchedules[engineDisplacement]) {
        activeSchedule = modelSchedules[engineDisplacement];
    } else {
        // 2. Pick the first engine listed for that model if exact displacement isn't found
        const availableEngines = Object.keys(modelSchedules);
        if (availableEngines.length > 0) {
            activeSchedule = modelSchedules[availableEngines[0]];
        }
    }
}

// 3. If model/make not in database, fallback to DEFAULT
if (!activeSchedule || !activeSchedule.length) {
    activeSchedule = schedulesDB["DEFAULT"] || [];
}
        // Evaluate Maintenance Intervals
        let dueNow = [];
        let upcoming = [];

        for (const item of activeSchedule) {
            let isDue = false;
            let isUpcoming = false;
            let reason = "";
            let badgeType = "badge-due";

            // 1. Evaluate Mileage
            if (item.intervalMiles) {
                const interval = item.intervalMiles;
                const milesSinceCycle = mileage % interval;
                const milesToNext = interval - milesSinceCycle;
                const targetMilestone = Math.floor(mileage / interval) * interval;
                const nextMilestone = targetMilestone + interval;

                // Window: within 1,500 miles approaching target OR passed within 1,500 miles
                if (mileage >= interval && milesSinceCycle <= 1500) {
                    isDue = true;
                    reason = `Mileage milestone reached (${targetMilestone.toLocaleString()} mi interval).`;
                } else if (milesToNext <= 1500) {
                    isDue = true;
                    reason = `Within 1,500 mi of ${nextMilestone.toLocaleString()} mi interval.`;
                } else if (mileage >= interval && milesSinceCycle > 1500 && milesToNext > 1500) {
                    // Overdue if never completed
                    isDue = true;
                    reason = `Overdue from ${targetMilestone.toLocaleString()} mi (or verify history).`;
                } else if (milesToNext > 1500 && milesToNext <= 4000) {
                    isUpcoming = true;
                    reason = `Due at ${nextMilestone.toLocaleString()} mi (in ${milesToNext.toLocaleString()} mi).`;
                }
            }

            // 2. Evaluate Time (Whichever comes first rule)
            if (item.intervalMonths) {
                const intervalMo = item.intervalMonths;
                const monthsSinceCycle = age.totalMonths % intervalMo;
                const monthsToNext = intervalMo - monthsSinceCycle;

                if (age.totalMonths >= intervalMo && monthsSinceCycle <= 1) {
                    isDue = true;
                    badgeType = "badge-time";
                    reason += (reason ? " | " : "") + `Time milestone reached (${Math.floor(age.totalMonths / intervalMo) * (intervalMo / 12)} yr interval).`;
                } else if (age.totalMonths >= intervalMo && monthsSinceCycle > 1) {
                    isDue = true;
                    badgeType = "badge-time";
                    reason += (reason ? " | " : "") + `Time interval exceeded (${intervalMo / 12} yr rule).`;
                }
            }

            if (isDue) {
                dueNow.push({ ...item, reason, badgeType });
            } else if (isUpcoming) {
                upcoming.push({ ...item, reason });
            }
        }

        // Render to Screen
        renderOutput({
            vin, mileage, inServiceDate, age,
            year, make, model, engineDisplacement, driveType, fuel, transmission,
            dueNow, upcoming
        });

    } catch (err) {
        console.error(err);
        resultContainer.innerHTML = `<div class="card"><p style="color:var(--danger);">Error decoding VIN. Please check connection and try again.</p></div>`;
    }
}

// ==========================================
// RENDER UI & COPY TO CLIPBOARD
// ==========================================
function renderOutput(data) {
    const resultContainer = document.getElementById("result");

    let dueHtml = "";
    if (data.dueNow.length > 0) {
        dueHtml = data.dueNow.map(s => `
            <div class="service-card due">
                <div>
                    <div class="service-title">${s.name}</div>
                    <div class="service-desc">${s.reason} — <em>${s.note}</em></div>
                </div>
                <span class="badge ${s.badgeType}">RECOMMENDED</span>
            </div>
        `).join("");
    } else {
        dueHtml = `<div class="empty-state">✅ No factory services currently due.</div>`;
    }

    let upcomingHtml = "";
    if (data.upcoming.length > 0) {
        upcomingHtml = data.upcoming.map(s => `
            <div class="service-card upcoming">
                <div>
                    <div class="service-title">${s.name}</div>
                    <div class="service-desc">${s.reason}</div>
                </div>
                <span class="badge badge-upcoming">COMING UP</span>
            </div>
        `).join("");
    }

    resultContainer.innerHTML = `
        <div class="card">
            <div class="vehicle-banner">
                <div>
                    <h2>${data.year} ${data.make} ${data.model}</h2>
                    <p style="font-size:13px; color:var(--text-secondary); margin-top:3px;">VIN: <strong>${data.vin}</strong></p>
                </div>
                <div class="vehicle-badge">${data.mileage.toLocaleString()} Miles</div>
            </div>

            <div class="specs-grid">
                <div>Engine: <strong>${data.engineDisplacement}L</strong></div>
                <div>Drive: <strong>${data.driveType}</strong></div>
                <div>Transmission: <strong>${data.transmission}</strong></div>
                <div>Age: <strong>${data.age.years} yrs, ${data.age.months} mos</strong></div>
                <div>In-Service: <strong>${data.inServiceDate}</strong></div>
            </div>

            <div class="section-title">🔴 Recommended Today / Due Now</div>
            ${dueHtml}

            ${data.upcoming.length > 0 ? `
                <div class="section-title">🟡 Upcoming Service Window</div>
                ${upcomingHtml}
            ` : ""}

            <button id="copyNotesBtn" class="btn btn-copy">📋 Copy Recommendations to DMS Notes</button>
        </div>
    `;

    // DMS Copy Button Logic
    document.getElementById("copyNotesBtn").addEventListener("click", () => {
        const dueList = data.dueNow.map(i => `- ${i.name} (${i.reason})`).join("\n");
        const dmsText = `VEHICLE: ${data.year} ${data.make} ${data.model} (${data.mileage.toLocaleString()} mi)\nAGE: ${data.age.years}y ${data.age.months}m\nRECOMMENDED SERVICES:\n${dueList || "None"}`;

        navigator.clipboard.writeText(dmsText).then(() => {
            const btn = document.getElementById("copyNotesBtn");
            btn.textContent = "✅ Copied to Clipboard!";
            setTimeout(() => { btn.textContent = "📋 Copy Recommendations to DMS Notes"; }, 2000);
        });
    });
}

// ==========================================
// EVENT LISTENERS
// ==========================================
document.getElementById("decodeButton").addEventListener("click", decodeVehicle);

// Allow pressing "Enter" from any input
["vin", "mileage", "inServiceDate"].forEach(id => {
    document.getElementById(id).addEventListener("keypress", (e) => {
        if (e.key === "Enter") decodeVehicle();
    });
});

// Clear Button
document.getElementById("clearButton").addEventListener("click", () => {
    document.getElementById("vin").value = "";
    document.getElementById("mileage").value = "";
    document.getElementById("inServiceDate").value = "";
    document.getElementById("result").innerHTML = "";
    document.getElementById("vin").focus();
});
