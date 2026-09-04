// ==========================================
// SERVICETOOL - ADVISOR QUICK LOOKUP ENGINE
// ==========================================

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

async function loadSchedules() {
    try {
        const response = await fetch("./schedules.json");
        if (response.ok) schedulesDB = await response.json();
    } catch (err) {
        console.warn("Using built-in fallback schedules.");
    }
}
loadSchedules();

// ==========================================
// FUZZY DATE PARSER
// ==========================================
function parseFuzzyDate(raw) {
    if (!raw) return null;
    const clean = raw.trim().toLowerCase();

    const monthMap = {
        jan: 0, january: 0,
        feb: 1, february: 1,
        mar: 2, march: 2,
        apr: 3, april: 3,
        may: 4,
        jun: 5, june: 5,
        jul: 6, july: 6,
        aug: 7, august: 7,
        sep: 8, sept: 8, september: 8,
        oct: 9, october: 9,
        nov: 10, november: 10,
        dec: 11, december: 11
    };

    // 1. Year only: e.g. "2020" or "2022"
    if (/^\d{4}$/.test(clean)) {
        const y = parseInt(clean, 10);
        return { date: new Date(y, 6, 1), label: `Mid-${y} (Est)` };
    }

    // 2. Month name + year: e.g. "aug 20", "august 2020", "aug 2020"
    const textMatch = clean.match(/^([a-z]+)\s*['\s/-]?\s*(\d{2,4})$/);
    if (textMatch) {
        const mKey = textMatch[1];
        if (monthMap[mKey] !== undefined) {
            let y = parseInt(textMatch[2], 10);
            if (y < 100) y += 2000;
            const m = monthMap[mKey];
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return { date: new Date(y, m, 1), label: `${monthNames[m]} ${y}` };
        }
    }

    // 3. Numeric MM/YY or MM/YYYY: e.g. "08/20", "8/20", "08/2020"
    const slashMatch = clean.match(/^(\d{1,2})[\/\-](\d{2,4})$/);
    if (slashMatch) {
        const m = parseInt(slashMatch[1], 10) - 1;
        let y = parseInt(slashMatch[2], 10);
        if (y < 100) y += 2000;
        if (m >= 0 && m < 12) {
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return { date: new Date(y, m, 1), label: `${monthNames[m]} ${y}` };
        }
    }

    // 4. Standard full date parse fallback: e.g. "08/15/2020" or "2020-08-15"
    const standard = new Date(raw);
    if (!isNaN(standard.getTime())) {
        return { date: standard, label: standard.toLocaleDateString() };
    }

    return null;
}

// Calculate age from parsed Date
function calculateAgeFromDate(startDate) {
    const today = new Date();
    let years = today.getFullYear() - startDate.getFullYear();
    let months = today.getMonth() - startDate.getMonth();

    if (months < 0 || (months === 0 && today.getDate() < startDate.getDate())) {
        years--;
        months += 12;
    }

    const totalMonths = Math.max(0, (years * 12) + months);
    return { years: Math.max(0, years), months, totalMonths };
}

// ==========================================
// SMART MODEL MATCHER
// ==========================================
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

// ==========================================
// MAIN DECODE & CALCULATION FUNCTION
// ==========================================
async function decodeVehicle() {
    const vinInput = document.getElementById("vin");
    const mileageInput = document.getElementById("mileage");
    const dateInput = document.getElementById("inServiceDate");
    const nameInput = document.getElementById("customerName");
    const resultContainer = document.getElementById("result");

    const vin = vinInput.value.trim().toUpperCase();
    const mileage = Number(mileageInput.value);
    const inServiceRaw = dateInput.value.trim();
    const customerName = nameInput.value.trim();

    if (vin.length !== 17) {
        resultContainer.innerHTML = `<div class="card"><p style="color:var(--danger); font-weight:bold;">⚠️ Please enter a complete 17-character VIN.</p></div>`;
        return;
    }
    if (!mileage || mileage < 0) {
        resultContainer.innerHTML = `<div class="card"><p style="color:var(--danger); font-weight:bold;">⚠️ Please enter valid current mileage.</p></div>`;
        return;
    }
    if (!inServiceRaw) {
        resultContainer.innerHTML = `<div class="card"><p style="color:var(--danger); font-weight:bold;">⚠️ Please enter an In-Service Date or Year (e.g. Aug 20, 2021).</p></div>`;
        return;
    }

    // Fuzzy Date Parsing
    const parsedDateObj = parseFuzzyDate(inServiceRaw);
    if (!parsedDateObj) {
        resultContainer.innerHTML = `<div class="card"><p style="color:var(--danger); font-weight:bold;">⚠️ Could not recognize date format. Try: 'Aug 20', '08/2020', or '2021'.</p></div>`;
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

        const age = calculateAgeFromDate(parsedDateObj.date);
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
            vin, mileage, customerName,
            inServiceLabel: parsedDateObj.label,
            age,
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
                    <p style="font-size:13px; color:var(--text-secondary); margin-top:3px;">
                        VIN: <strong>${data.vin}</strong>
                        ${data.customerName ? ` | Customer: <strong>${data.customerName}</strong>` : ""}
                    </p>
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
                <div>In-Service: <strong>${data.inServiceLabel}</strong></div>
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

    document.getElementById("openStoryModalBtn").addEventListener("click", openStoryModal);

    document.getElementById("copyNotesBtn").addEventListener("click", () => {
        const dueList = data.dueNow.map(i => {
            const priceStr = i.price ? ` ($${i.price})` : "";
            return `- ${i.name}${priceStr} [${i.reason}]`;
        }).join("\n");

        const totalStr = pricedTotal > 0 ? `\nESTIMATED TOTAL: $${pricedTotal.toLocaleString()}` : "";
        const clientStr = data.customerName ? `CUSTOMER: ${data.customerName}\n` : "";
        const dmsText = `${clientStr}VEHICLE: ${data.year} ${data.make} ${data.model} (${data.mileage.toLocaleString()} mi)\nAGE: ${data.age.years}y ${data.age.months}m\nRECOMMENDED SERVICES:\n${dueList || "None"}${totalStr}`;

        navigator.clipboard.writeText(dmsText).then(() => {
            const btn = document.getElementById("copyNotesBtn");
            btn.textContent = "✅ Copied to Clipboard!";
            setTimeout(() => { btn.textContent = "📋 Copy Recommendations to DMS Notes"; }, 2000);
        });
    });
}

// ==========================================
// STORY & FUTURE-APPOINTMENT SMS GENERATOR
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

    const greetingName = v.customerName ? ` ${v.customerName}` : " there";

    if (v.dueNow.length === 0) {
        wordTrackEl.innerHTML = `<p>“Hi${greetingName}, looking ahead to your visit for the ${v.model}, great news: your factory maintenance is completely up to date. We will perform our full multi-point safety inspection to ensure everything remains in top shape.”</p>`;
        smsEl.value = `Hi${greetingName}! Ahead of your upcoming service appointment for your ${v.year} ${v.make} ${v.model}, I checked your factory records and all scheduled maintenance is currently up to date! We'll perform our multi-point inspection when you come in. See you soon!`;
        modal.style.display = "flex";
        return;
    }

    // A. Spoken Word-Track
    let brandIntro = "";
    let brandClose = "";

    if (brandKey === "MASERATI") {
        brandIntro = `“Hi${greetingName}, looking ahead to your upcoming appointment for your ${v.model}: because of the high-performance engineering on these twin-turbo powertrains, factory maintenance intervals are designed to keep the vehicle driving in 100% factory peak condition.”`;
        brandClose = `“We can have all factory parts and fluids staged and reserved before your visit so everything is handled seamlessly. Would you like me to add these to your upcoming ticket?”`;
    } else if (brandKey === "ALFA ROMEO") {
        brandIntro = `“Hi${greetingName}, reviewing your ${v.model} before you come in: staying proactive on these scheduled items is what preserves that sharp handling and ensures long-term Italian reliability.”`;
        brandClose = `“I can have the technicians set these aside for your appointment so we get you in and out smoothly. Should I go ahead and reserve that for you?”`;
    } else {
        brandIntro = `“Hi${greetingName}, looking over your ${v.model} before your service visit: taking care of these factory items now is all about smart preventative maintenance and avoiding big repair bills down the road.”`;
        brandClose = `“We can easily knock these out during your appointment. Would you like me to get these added to your visit?”`;
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

    // B. Customer SMS (Future-Appointment Focused)
    const smsItems = v.dueNow.map(i => {
        const priceStr = i.price ? ` - $${i.price}` : "";
        const customReason = narratives[i.id] || i.name;
        return `• ${i.name}${priceStr} (${customReason})`;
    }).join("\n");

    const pricedTotal = v.dueNow.reduce((sum, item) => sum + (item.price || 0), 0);
    const totalLine = pricedTotal > 0 ? `\nEstimated Total: $${pricedTotal.toLocaleString()}` : "";

    smsEl.value = `Hi${greetingName}! Ahead of your upcoming service appointment for your ${v.year} ${v.make} ${v.model} (${v.mileage.toLocaleString()} mi), I reviewed your factory maintenance schedule. Based on time and mileage, here is what is due to be completed:\n\n${smsItems}${totalLine}\n\nWe can have all factory parts reserved and ready for your visit. Let me know if you would like me to add these to your appointment!`;

    modal.style.display = "flex";
}

// Modal Listeners
document.getElementById("closeModalBtn").addEventListener("click", () => {
    document.getElementById("storyModal").style.display = "none";
});

document.getElementById("storyModal").addEventListener("click", (e) => {
    if (e.target.id === "storyModal") document.getElementById("storyModal").style.display = "none";
});

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

// Form Listeners
document.getElementById("decodeButton").addEventListener("click", decodeVehicle);

["vin", "mileage", "inServiceDate", "customerName"].forEach(id => {
    document.getElementById(id).addEventListener("keypress", (e) => {
        if (e.key === "Enter") decodeVehicle();
    });
});

document.getElementById("clearButton").addEventListener("click", () => {
    document.getElementById("vin").value = "";
    document.getElementById("mileage").value = "";
    document.getElementById("inServiceDate").value = "";
    document.getElementById("customerName").value = "";
    document.getElementById("result").innerHTML = "";
    lastDecodedVehicle = null;
    document.getElementById("vin").focus();
});