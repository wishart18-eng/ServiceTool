// ==========================================
// SERVICETOOL - ADVISOR QUICK LOOKUP ENGINE
// ==========================================

// Built-in fallback database
const fallbackDB = {
  "MASERATI": {
    "GHIBLI": { "3.0": [{ "id": "oil_service", "name": "Engine Oil & Filter (Maserati Spec)", "intervalMiles": 10000, "intervalMonths": 12, "price": 910, "mandatory": true, "note": "Annual service or 10,000 miles." }] },
    "LEVANTE": { "3.0": [{ "id": "oil_service", "name": "Engine Oil & Filter (Maserati Spec)", "intervalMiles": 10000, "intervalMonths": 12, "price": 910, "mandatory": true, "note": "Annual service or 10,000 miles." }] },
    "GRECALE": { "2.0": [{ "id": "oil_service", "name": "Engine Oil & Filter Service (MHEV)", "intervalMiles": 10000, "intervalMonths": 12, "price": 910, "mandatory": true, "note": "10,000 miles or 1 year." }] },
    "QUATTROPORTE": { "3.0": [{ "id": "oil_service", "name": "Engine Oil & Filter (Maserati Spec)", "intervalMiles": 10000, "intervalMonths": 12, "price": 910, "mandatory": true, "note": "Annual service or 10,000 miles." }] }
  }
};

let schedulesDB = fallbackDB;
let lastDecodedVehicle = null;

// Brand-Specific Value Narratives
const itemNarratives = {
  "FIAT": {
    "oil_service": "The MultiAir hydraulic valve system relies 100% on pristine oil pressure. Fresh oil is your best low-cost protection against a $2,000 actuator repair.",
    "spark_plugs": "MultiAir turbos are sensitive to spark gap wear. Fresh plugs maintain peak MPG and prevent ignition coil failure.",
    "brake_fluid": "Brake fluid absorbs moisture over 2 years. Flushing it prevents rust in the calipers and avoids costly ABS repairs.",
    "cabin_filter": "Protects your blower motor and keeps AC cooling efficiently without straining the system.",
    "engine_filter": "Maximizes your fuel efficiency and keeps debris out of the turbocharger.",
    "default": "Regular preventative maintenance protects vehicle value and stops small issues from becoming expensive repair bills."
  },
  "ALFA ROMEO": {
    "oil_service": "The all-aluminum turbo operates at high boost and heat. Factory synthetic protects the turbo bearings and ensures sharp MultiAir valve timing for long-term reliability.",
    "brake_fluid": "The Giulia/Stelvio uses a brake-by-wire Integrated Brake System (IBS). Fresh fluid every 2 years keeps the hydraulic valves clean and pedal response firm.",
    "spark_plugs": "High-boost turbocharged engines demand clean combustion. Fresh plugs prevent micro-misfires and keep throttle response instantaneous.",
    "drive_belt": "The high-compression accessory drive belt is essential for alternator and water pump reliability—vital for worry-free ownership.",
    "cabin_filter": "Maintains clean airflow and protects the climate evaporator core from debris.",
    "engine_filter": "Ensures the twin-scroll turbo receives clean, unrestricted airflow for maximum power.",
    "default": "Essential precision maintenance to preserve your Alfa's performance, handling dynamics, and long-term mechanical health."
  },
  "MASERATI": {
    "oil_service": "Your Maserati's high-output, Ferrari-developed twin-turbo engine requires strict adherence to factory-spec synthetic oil to protect precision bearings and maintain exotic performance.",
    "brake_fluid": "Brembo high-performance calipers generate extreme operating heat. Fresh fluid prevents moisture boil, protecting braking response and preserving the calipers.",
    "spark_plugs": "Precision plug renewal every 37,500 miles ensures clean combustion and preserves the engine's signature power curve and exhaust note.",
    "drive_belt": "Auxiliary belts operate under high RPM load. Timely replacement is factory protocol to ensure flawless grand touring reliability.",
    "cabin_filter": "Maintains pristine cabin air quality and protects Maserati's specialized dual-zone climate system.",
    "engine_filter": "Twin turbochargers require balanced, unrestricted breathing to deliver instantaneous boost.",
    "default": "Factory protocol maintenance designed to keep your Maserati operating in 100% peak, flawless condition."
  }
};

// Load external schedule database
async function loadSchedules() {
    try {
        const response = await fetch("./schedules.json");
        if (response.ok) {
            schedulesDB = await response.json();
            console.log("Loaded schedules.json successfully.");
        }
    } catch (err) {
        console.warn("Using built-in fallback schedules.");
    }
}
loadSchedules();

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

function findScheduleForVehicle(make, rawModel, engineDisplacement) {
    if (!schedulesDB[make]) return schedulesDB["DEFAULT"] || [];

    const brandModels = schedulesDB[make];
    let matchedKey = null;

    for (const key of Object.keys(brandModels)) {
        if (rawModel.includes(key) || key.includes(rawModel)) {
            matchedKey = key;
            break;
        }
    }

    if (!matchedKey) return schedulesDB["DEFAULT"] || [];

    const engineVariants = brandModels[matchedKey];
    if (engineVariants[engineDisplacement]) {
        return engineVariants[engineDisplacement];
    }
    
    const available = Object.keys(engineVariants);
    if (available.length > 0) {
        return engineVariants[available[0]];
    }

    return schedulesDB["DEFAULT"] || [];
}

async function decodeVehicle() {
    const vinInput = document.getElementById("vin");
    const mileageInput = document.getElementById("mileage");
    const dateInput = document.getElementById("inServiceDate");
    const resultContainer = document.getElementById("result");

    const vin = vinInput.value.trim().toUpperCase();
    const mileage = Number(mileageInput.value);
    const inServiceDate = dateInput.value;

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

    resultContainer.innerHTML = `<div class="card"><p>Querying NHTSA database and calculating schedule...</p></div>`;

    try {
        const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`);
        if (!response.ok) throw new Error("API request failed.");
        const data = await response.json();

        if (!data.Results || data.Results.length === 0) {
            resultContainer.innerHTML = `<div class="card"><p>Vehicle not found. Check VIN.</p></div>`;
            return;
        }

        const v = data.Results[0];
        const make = (v.Make || "UNKNOWN").toUpperCase();
        const rawModel = (v.Model || "UNKNOWN").toUpperCase();
        const year = v.ModelYear || "N/A";
        const engineDisplacement = v.DisplacementL ? parseFloat(v.DisplacementL).toFixed(1) : "3.0";
        const driveType = v.DriveType || "N/A";
        const fuel = v.FuelTypePrimary || "Gasoline";
        const transmission = v.TransmissionStyle || "Automatic";

        const age = calculateAge(inServiceDate);
        const activeSchedule = findScheduleForVehicle(make, rawModel, engineDisplacement);

        let dueNow = [];
        let upcoming = [];

        for (const item of activeSchedule) {
            let isDue = false;
            let isUpcoming = false;
            let reason = "";
            let badgeType = "badge-due";

            if (item.intervalMiles) {
                const interval = item.intervalMiles;
                const milesSinceCycle = mileage % interval;
                const milesToNext = interval - milesSinceCycle;
                const targetMilestone = Math.floor(mileage / interval) * interval;
                const nextMilestone = targetMilestone + interval;

                if (mileage >= interval && milesSinceCycle <= 1500) {
                    isDue = true;
                    reason = `Mileage milestone reached (${targetMilestone.toLocaleString()} mi interval).`;
                } else if (milesToNext <= 1500) {
                    isDue = true;
                    reason = `Within 1,500 mi of ${nextMilestone.toLocaleString()} mi interval.`;
                } else if (mileage >= interval && milesSinceCycle > 1500 && milesToNext > 1500) {
                    isDue = true;
                    reason = `Overdue from ${targetMilestone.toLocaleString()} mi (or verify history).`;
                } else if (milesToNext > 1500 && milesToNext <= 4000) {
                    isUpcoming = true;
                    reason = `Due at ${nextMilestone.toLocaleString()} mi (in ${milesToNext.toLocaleString()} mi).`;
                }
            }

            if (item.intervalMonths) {
                const intervalMo = item.intervalMonths;
                const monthsSinceCycle = age.totalMonths % intervalMo;

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

        lastDecodedVehicle = {
            vin, mileage, inServiceDate, age,
            year, make, model: rawModel, engineDisplacement, driveType, fuel, transmission,
            dueNow, upcoming
        };

        renderOutput(lastDecodedVehicle);

    } catch (err) {
        console.error(err);
        resultContainer.innerHTML = `<div class="card"><p style="color:var(--danger);">Error decoding VIN. Please check connection and try again.</p></div>`;
    }
}

// ==========================================
// RENDER UI
// ==========================================
function renderOutput(data) {
    const resultContainer = document.getElementById("result");
    const pricedTotal = data.dueNow.reduce((sum, item) => sum + (item.price || 0), 0);

    let dueHtml = "";
    if (data.dueNow.length > 0) {
        dueHtml = data.dueNow.map(s => {
            const priceTag = (s.price !== undefined && s.price !== null) ? `<span class="service-price">$${s.price.toLocaleString()}</span>` : "";
            return `
                <div class="service-card due">
                    <div>
                        <div class="service-title">
                            ${s.name}
                            ${priceTag}
                        </div>
                        <div class="service-desc">${s.reason} — <em>${s.note}</em></div>
                    </div>
                    <span class="badge ${s.badgeType}">RECOMMENDED</span>
                </div>
            `;
        }).join("");

        if (pricedTotal > 0) {
            dueHtml += `
                <div class="price-summary">
                    <div>Estimated Subtotal (Priced Services):</div>
                    <span>$${pricedTotal.toLocaleString()}</span>
                </div>
            `;
        }
    } else {
        dueHtml = `<div class="empty-state">✅ No factory services currently due.</div>`;
    }

    let upcomingHtml = "";
    if (data.upcoming.length > 0) {
        upcomingHtml = data.upcoming.map(s => {
            const priceTag = (s.price !== undefined && s.price !== null) ? `<span class="service-price">$${s.price.toLocaleString()}</span>` : "";
            return `
                <div class="service-card upcoming">
                    <div>
                        <div class="service-title">
                            ${s.name}
                            ${priceTag}
                        </div>
                        <div class="service-desc">${s.reason}</div>
                    </div>
                    <span class="badge badge-upcoming">COMING UP</span>
                </div>
            `;
        }).join("");
    }

    resultContainer.innerHTML = `
        <div class="card">
            <div class="vehicle-banner">
                <div>
                    <h2>${data.year} ${data.make} ${data.model}</h2>
                    <p style="font-size:13px; color:var(--text-secondary); margin-top:3px;">VIN: <strong>${data.vin}</strong></p>
                </div>
                <div class="banner-actions">
                    <button id="openStoryModalBtn" class="btn-story">💬 Advisor Pitch & SMS Story</button>
                    <div class="vehicle-badge">${data.mileage.toLocaleString()} Miles</div>
                </div>
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

    // Hook up Master Pitch Modal Button
    document.getElementById("openStoryModalBtn").addEventListener("click", openStoryModal);

    // DMS Notes Copy Button
    document.getElementById("copyNotesBtn").addEventListener("click", () => {
        const dueList = data.dueNow.map(i => {
            const priceStr = i.price ? ` ($${i.price})` : "";
            return `- ${i.name}${priceStr} [${i.reason}]`;
        }).join("\n");

        const totalStr = pricedTotal > 0 ? `\nESTIMATED TOTAL: $${pricedTotal.toLocaleString()}` : "";
        const dmsText = `VEHICLE: ${data.year} ${data.make} ${data.model} (${data.mileage.toLocaleString()} mi)\nAGE: ${data.age.years}y ${data.age.months}m\nRECOMMENDED SERVICES:\n${dueList || "None"}${totalStr}`;

        navigator.clipboard.writeText(dmsText).then(() => {
            const btn = document.getElementById("copyNotesBtn");
            btn.textContent = "✅ Copied to Clipboard!";
            setTimeout(() => { btn.textContent = "📋 Copy Recommendations to DMS Notes"; }, 2000);
        });
    });
}

// ==========================================
// STORY & SMS GENERATOR
// ==========================================
function openStoryModal() {
    if (!lastDecodedVehicle) return;

    const v = lastDecodedVehicle;
    const modal = document.getElementById("storyModal");
    const title = document.getElementById("modalVehicleTitle");
    const wordTrackEl = document.getElementById("wordTrackText");
    const smsEl = document.getElementById("smsText");

    title.textContent = `${v.year} ${v.make} ${v.model} — Service Story`;

    const brandKey = v.make.includes("MASERATI") ? "MASERATI" : (v.make.includes("ALFA") ? "ALFA ROMEO" : (v.make.includes("FIAT") ? "FIAT" : "ALFA ROMEO"));
    const narratives = itemNarratives[brandKey] || itemNarratives["ALFA ROMEO"];

    if (v.dueNow.length === 0) {
        wordTrackEl.innerHTML = `<p>“Mr./Ms. Customer, great news on your ${v.model}. At ${v.mileage.toLocaleString()} miles, your factory maintenance is currently up to date. We'll complete our multi-point inspection to ensure everything looks pristine and let you know when the next visit is expected.”</p>`;
        smsEl.value = `Hi! Your ${v.year} ${v.make} ${v.model} is currently up to date on all factory maintenance intervals. We are completing your multi-point inspection now!`;
        modal.style.display = "flex";
        return;
    }

    // A. Build Spoken Word-Track
    let brandIntro = "";
    let brandClose = "";

    if (brandKey === "MASERATI") {
        brandIntro = `“Looking at your ${v.model}, because of the high-performance engineering on these twin-turbo powertrains, the factory maintenance schedule is designed to keep the car performing as close to brand-new as possible.”`;
        brandClose = `“Taking care of these today maintains that crisp exotic throttle feel and protects the vehicle's long-term resale provenance. Would you like us to proceed while it's in the shop?”`;
    } else if (brandKey === "ALFA ROMEO") {
        brandIntro = `“I pulled up the factory interval for your ${v.model}. With modern Alfa powertrains, staying on top of scheduled service is what ensures long-term Italian reliability and keeps the car driving like day one.”`;
        brandClose = `“Addressing this today ensures uninterrupted reliability and protects your factory warranty. Would you like me to get the technicians started?”`;
    } else {
        brandIntro = `“Looking over your ${v.model} at ${v.mileage.toLocaleString()} miles, doing these factory services today is all about smart preventative maintenance and avoiding big repair bills down the road.”`;
        brandClose = `“Staying proactive on these items keeps your operating costs low and prevents any surprise breakdowns. Should we go ahead and take care of these for you?”`;
    }

    const itemPoints = v.dueNow.map(i => {
        const customReason = narratives[i.id] || i.note || narratives["default"];
        const priceStr = i.price ? ` ($${i.price})` : "";
        return `<p>• <strong>${i.name}${priceStr}:</strong> ${customReason}</p>`;
    }).join("");

    wordTrackEl.innerHTML = `
        <p>${brandIntro}</p>
        ${itemPoints}
        <p>${brandClose}</p>
    `;

    // B. Build Customer SMS
    const smsItems = v.dueNow.map(i => {
        const priceStr = i.price ? ` - $${i.price}` : "";
        const customReason = narratives[i.id] || i.name;
        return `• ${i.name}${priceStr} (${customReason})`;
    }).join("\n");

    const pricedTotal = v.dueNow.reduce((sum, item) => sum + (item.price || 0), 0);
    const totalLine = pricedTotal > 0 ? `\nEstimated Total: $${pricedTotal.toLocaleString()}` : "";

    smsEl.value = `Hi [Customer Name]! Here is a quick update on your ${v.year} ${v.model} (${v.mileage.toLocaleString()} mi). Based on factory intervals, the following maintenance is due for this visit:\n\n${smsItems}${totalLine}\n\nLet me know if you'd like us to take care of these for you today!`;

    modal.style.display = "flex";
}

// Modal Event Listeners
document.getElementById("closeModalBtn").addEventListener("click", () => {
    document.getElementById("storyModal").style.display = "none";
});

document.getElementById("storyModal").addEventListener("click", (e) => {
    if (e.target.id === "storyModal") {
        document.getElementById("storyModal").style.display = "none";
    }
});

// Copy Buttons inside Modal
document.getElementById("copyWordTrackBtn").addEventListener("click", () => {
    const text = document.getElementById("wordTrackText").innerText;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById("copyWordTrackBtn");
        btn.textContent = "✅ Copied!";
        setTimeout(() => { btn.textContent = "📋 Copy Script"; }, 2000);
    });
});

document.getElementById("copySmsBtn").addEventListener("click", () => {
    const text = document.getElementById("smsText").value;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById("copySmsBtn");
        btn.textContent = "✅ Copied!";
        setTimeout(() => { btn.textContent = "📋 Copy SMS"; }, 2000);
    });
});

// Main Listeners
document.getElementById("decodeButton").addEventListener("click", decodeVehicle);

["vin", "mileage", "inServiceDate"].forEach(id => {
    document.getElementById(id).addEventListener("keypress", (e) => {
        if (e.key === "Enter") decodeVehicle();
    });
});

document.getElementById("clearButton").addEventListener("click", () => {
    document.getElementById("vin").value = "";
    document.getElementById("mileage").value = "";
    document.getElementById("inServiceDate").value = "";
    document.getElementById("result").innerHTML = "";
    lastDecodedVehicle = null;
    document.getElementById("vin").focus();
});
