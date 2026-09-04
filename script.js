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
// OFFICIAL VIN VALIDATOR & CHECK-DIGIT
// ==========================================
function validateVIN(vin) {
    if (!vin || vin.length !== 17) return { valid: false };
    vin = vin.toUpperCase();

    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
        return { valid: false };
    }

    const transliteration = {
        'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,
        'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7, 'R': 9,
        'S': 2, 'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9,
        '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9
    };

    const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

    let sum = 0;
    for (let i = 0; i < 17; i++) {
        sum += transliteration[vin[i]] * weights[i];
    }

    const remainder = sum % 11;
    const expectedCheck = remainder === 10 ? 'X' : String(remainder);

    return {
        valid: true,
        strictCheckDigitPassed: (vin[8] === expectedCheck),
        vin: vin
    };
}

// Fuzzy Date Parser
function parseFuzzyDate(raw) {
    if (!raw) return null;
    const clean = raw.trim().toLowerCase();

    const monthMap = {
        jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
        apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
        aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9,
        nov: 10, november: 10, dec: 11, december: 11
    };

    if (/^\d{4}$/.test(clean)) {
        const y = parseInt(clean, 10);
        return { date: new Date(y, 6, 1), label: `Mid-${y} (Est)` };
    }

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

    const standard = new Date(raw);
    if (!isNaN(standard.getTime())) {
        return { date: standard, label: standard.toLocaleDateString() };
    }

    return null;
}

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

// Decode Function
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

    const vinCheck = validateVIN(vin);
    if (!vinCheck.valid) {
        resultContainer.innerHTML = `<p style="color:red;"><strong>⚠️ Please enter a valid 17-character VIN (cannot contain I, O, or Q).</strong></p>`;
        return;
    }

    if (!mileage || mileage < 0) {
        resultContainer.innerHTML = `<p style="color:red;"><strong>Please enter the current mileage.</strong></p>`;
        return;
    }
    if (!inServiceRaw) {
        resultContainer.innerHTML = `<p style="color:red;"><strong>Please enter the in-service date or year.</strong></p>`;
        return;
    }

    const parsedDateObj = parseFuzzyDate(inServiceRaw);
    if (!parsedDateObj) {
        resultContainer.innerHTML = `<p style="color:red;"><strong>Could not recognize date. Try: 'Aug 20', '08/2020', or '2021'.</strong></p>`;
        return;
    }

    resultContainer.innerHTML = `<p>Decoding vehicle and calculating maintenance...</p>`;

    try {
        const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`);
        if (!response.ok) throw new Error("API request failed.");
        const data = await response.json();

        if (!data.Results || data.Results.length === 0) {
            resultContainer.innerHTML = `<p><strong>No vehicle information found.</strong></p>`;
            return;
        }

        const v = data.Results[0];
        const make = (v.Make || "UNKNOWN").toUpperCase();
        const rawModel = (v.Model || "UNKNOWN").toUpperCase();
        const year = v.ModelYear || "N/A";
        const engineDisplacement = v.DisplacementL ? parseFloat(v.DisplacementL).toFixed(1) : "3.0";
        const cylinders = v.EngineCylinders || "Unknown";
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

            if (item.intervalMiles) {
                const interval = item.intervalMiles;
                const milesSinceCycle = mileage % interval;
                const milesToNext = interval - milesSinceCycle;
                const targetMilestone = Math.floor(mileage / interval) * interval;
                const nextMilestone = targetMilestone + interval;

                if (mileage >= interval && milesSinceCycle <= 1500) {
                    isDue = true;
                    reason = `Mileage reached (${targetMilestone.toLocaleString()} mi interval).`;
                } else if (milesToNext <= 1500) {
                    isDue = true;
                    reason = `Within 1,500 mi of ${nextMilestone.toLocaleString()} mi interval.`;
                } else if (mileage >= interval && milesSinceCycle > 1500 && milesToNext > 1500) {
                    isDue = true;
                    reason = `Overdue from ${targetMilestone.toLocaleString()} mi (or verify history).`;
                } else if (milesToNext > 1500 && milesToNext <= 4000) {
                    isUpcoming = true;
                    reason = `Due at ${nextMilestone.toLocaleString()} mi.`;
                }
            }

            if (item.intervalMonths) {
                const intervalMo = item.intervalMonths;
                const monthsSinceCycle = age.totalMonths % intervalMo;

                if (age.totalMonths >= intervalMo && monthsSinceCycle <= 1) {
                    isDue = true;
                    reason += (reason ? " | " : "") + `Time milestone reached (${Math.floor(age.totalMonths / intervalMo) * (intervalMo / 12)} yr rule).`;
                } else if (age.totalMonths >= intervalMo && monthsSinceCycle > 1) {
                    isDue = true;
                    reason += (reason ? " | " : "") + `Time interval exceeded (${intervalMo / 12} yr rule).`;
                }
            }

            if (isDue) {
                dueNow.push({ ...item, reason });
            } else if (isUpcoming) {
                upcoming.push({ ...item, reason });
            }
        }

        lastDecodedVehicle = {
            vin, mileage, customerName,
            inServiceLabel: parsedDateObj.label,
            age,
            year, make, model: rawModel, engineDisplacement, cylinders, driveType, fuel, transmission,
            dueNow, upcoming
        };

        renderOutput(lastDecodedVehicle);

    } catch (err) {
        console.error(err);
        resultContainer.innerHTML = `<p style="color:red;"><strong>Unable to decode VIN. Please check connection and try again.</strong></p>`;
    }
}

// Render Table
function renderOutput(data) {
    const resultContainer = document.getElementById("result");
    const pricedTotal = data.dueNow.reduce((sum, item) => sum + (item.price || 0), 0);

    let html = `
        <div class="vehicle-result">
            <h2>
                ${data.year} ${data.make} ${data.model}
                <button type="button" id="openStoryModalBtn" class="btn-story-action">💬 Advisor Pitch & SMS Story</button>
            </h2>

            <p><strong>VIN:</strong> ${data.vin}</p>
            ${data.customerName ? `<p><strong>Customer:</strong> ${data.customerName}</p>` : ""}
            <p><strong>Engine:</strong> ${data.engineDisplacement}L (${data.cylinders}-cylinder)</p>
            <p><strong>Fuel:</strong> ${data.fuel}</p>
            <p><strong>Transmission:</strong> ${data.transmission}</p>
            <p><strong>Drive:</strong> ${data.driveType}</p>
            <p><strong>Current Mileage:</strong> ${data.mileage.toLocaleString()} miles</p>
            <p><strong>In-Service:</strong> ${data.inServiceLabel}</p>
            <p><strong>Vehicle Age:</strong> ${data.age.years} years, ${data.age.months} months</p>

            <hr>

            <h2>Factory Maintenance Worksheet</h2>
    `;

    if (data.dueNow.length > 0) {
        html += `
            <h3>🔴 Recommended For This Visit</h3>
            <div class="worksheet-table">
                <div class="worksheet-header">
                    <span>Scheduled Operation</span>
                    <span>Status & Estimate</span>
                </div>
        `;

        data.dueNow.forEach(s => {
            const priceTag = (s.price !== undefined && s.price !== null) ? `<span class="service-price">$${s.price.toLocaleString()}</span>` : "";
            html += `
                <div class="service-row">
                    <div class="service-info">
                        <div class="service-title-line">
                            <span class="status-indicator"></span>
                            <span class="service-title-text">${s.name}</span>
                        </div>
                        <div class="service-details"><strong>Why:</strong> ${s.reason}</div>
                        <div class="service-note-text">${s.note}</div>
                    </div>
                    <div class="service-right">
                        ${priceTag}
                        <span class="badge-due-pill">FACTORY DUE</span>
                    </div>
                </div>
            `;
        });

        if (pricedTotal > 0) {
            html += `
                <div class="worksheet-footer">
                    <span class="footer-label">Estimated Subtotal (Priced Services):</span>
                    <span class="footer-total-amount">$${pricedTotal.toLocaleString()}</span>
                </div>
            `;
        }

        html += `</div>`;
    } else {
        html += `<h3>🟢 No factory maintenance currently due.</h3>`;
    }

    if (data.upcoming.length > 0) {
        html += `<hr><h3>🟡 Approaching In Next Service Window</h3>`;
        data.upcoming.forEach(s => {
            const priceTag = (s.price !== undefined && s.price !== null) ? `<span class="service-price">$${s.price.toLocaleString()}</span>` : "";
            html += `
                <div class="upcoming-row">
                    <span><strong>${s.name}</strong> — ${s.reason}</span>
                    <div>${priceTag}</div>
                </div>
            `;
        });
    }

    html += `
            <hr>
            <button type="button" id="copyNotesBtn" class="btn-dms">📋 Copy Recommendations to DMS Notes</button>
        </div>
    `;

    resultContainer.innerHTML = html;

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
        wordTrackEl.innerHTML = `<p>“Hi${greetingName}, looking ahead to your visit for the ${v.model}: your factory maintenance is completely up to date. We will perform our full multi-point safety inspection to ensure everything remains in top shape.”</p>`;
        smsEl.value = `Hi${greetingName}! Ahead of your upcoming service appointment for your ${v.year} ${v.make} ${v.model}, all factory scheduled maintenance is currently up to date! We'll perform our multi-point inspection when you arrive. See you soon!`;
        modal.style.display = "flex";
        return;
    }

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
        btn.textContent = "Copied!";
        setTimeout(() => { btn.textContent = "Copy Script"; }, 2000);
    });
});

document.getElementById("copySmsBtn").addEventListener("click", () => {
    const text = document.getElementById("smsText").value;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById("copySmsBtn");
        btn.textContent = "Copied!";
        setTimeout(() => { btn.textContent = "Copy SMS"; }, 2000);
    });
});

// Form Listeners
document.getElementById("decodeButton").addEventListener("click", decodeVehicle);

["vin", "mileage", "inServiceDate", "customerName"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener("keypress", (e) => {
            if (e.key === "Enter") decodeVehicle();
        });
    }
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


// ==========================================
// HIGH-PRECISION BARCODE + TUNED VIN SCANNER
// ==========================================
const cameraBtn = document.getElementById("cameraBtn");
const scannerModal = document.getElementById("scannerModal");
const closeScannerBtn = document.getElementById("closeScannerBtn");
const scannerVideo = document.getElementById("scannerVideo");
const scannerCanvas = document.getElementById("scannerCanvas");
const scannerLiveRead = document.getElementById("scannerLiveRead");
const scannerReticle = document.getElementById("scannerReticle");
const forceSnapBtn = document.getElementById("forceSnapBtn");
const vinInputField = document.getElementById("vin");

let videoStream = null;
let scanTimer = null;
let isProcessingFrame = false;
let ocrWorker = null;
let barcodeReader = null;

// 1. Initialize High-Precision Tesseract (Restricted strictly to VIN charset)
async function initOCRWorker() {
    if (!ocrWorker) {
        scannerLiveRead.textContent = "Calibrating VIN scanner...";
        ocrWorker = await Tesseract.createWorker('eng');
        
        // CRITICAL TUNING FOR VIN PLATES:
        // - Only valid VIN characters (No I, O, Q, no lowercase, no punctuation)
        // - Single text line PSM (7) instead of multi-line book mode (3)
        await ocrWorker.setParameters({
            tessedit_char_whitelist: '0123456789ABCDEFGHJKLMNPRSTUVWXYZ',
            tessedit_pageseg_mode: '7'
        });
    }
    if (!barcodeReader && window.ZXing) {
        barcodeReader = new ZXing.BrowserMultiFormatReader();
    }
}

// 2. Launch Camera
async function startLiveScanner() {
    try {
        scannerModal.style.display = "flex";
        scannerLiveRead.textContent = "Starting camera...";
        scannerReticle.classList.remove("locked");

        videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "environment",
                width: { ideal: 1920 }, // Request high-definition for small VIN characters
                height: { ideal: 1080 }
            }
        });

        scannerVideo.srcObject = videoStream;
        await scannerVideo.play();

        await initOCRWorker();

        scannerLiveRead.textContent = "Aim at door barcode or dash VIN...";
        isProcessingFrame = false;

        // Loop every 450ms
        scanTimer = setInterval(analyzeFrame, 450);

    } catch (err) {
        console.error("Camera error:", err);
        alert("Camera permission denied or camera not found.");
        stopLiveScanner();
    }
}

function stopLiveScanner() {
    if (scanTimer) {
        clearInterval(scanTimer);
        scanTimer = null;
    }
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    if (scannerVideo) scannerVideo.srcObject = null;
    if (scannerModal) scannerModal.style.display = "none";
}

// 3. Contrast & Binarization Enhancer for Stamped Metal and Backlit Screens
function enhanceContrast(ctx, width, height) {
    const imgData = ctx.getImageData(0, 0, width, height);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
        // Luminance
        let gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        
        // Contrast expansion curve (makes faint etched characters bold)
        gray = ((gray - 128) * 2.2) + 128;
        gray = Math.max(0, Math.min(255, gray));

        d[i] = gray;
        d[i + 1] = gray;
        d[i + 2] = gray;
    }

    ctx.putImageData(imgData, 0, 0);
}

// 4. Main Frame Analysis (Barcode Check -> OCR Fallback)
async function analyzeFrame() {
    if (isProcessingFrame || !ocrWorker || scannerVideo.readyState !== 4) return;
    isProcessingFrame = true;

    try {
        const vw = scannerVideo.videoWidth;
        const vh = scannerVideo.videoHeight;

        // Tightly crop the reticle box where the user aims
        const cropW = Math.floor(vw * 0.85);
        const cropH = Math.floor(vh * 0.22);
        const cropX = Math.floor((vw - cropW) / 2);
        const cropY = Math.floor((vh - cropH) / 2);

        // Scale canvas up 2x so small stamped VIN characters are tall enough for OCR
        scannerCanvas.width = cropW * 2;
        scannerCanvas.height = cropH * 2;
        const ctx = scannerCanvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;

        // Draw zoomed crop
        ctx.drawImage(scannerVideo, cropX, cropY, cropW, cropH, 0, 0, scannerCanvas.width, scannerCanvas.height);

        // A. Check for Barcodes First (Code 39 / DataMatrix automotive standard)
        if (barcodeReader) {
            try {
                const barcodeResult = barcodeReader.decode(scannerCanvas);
                if (barcodeResult && barcodeResult.text) {
                    let bcText = barcodeResult.text.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    // Some imported barcodes prepend 'I' or '1'
                    if (bcText.length === 18 && (bcText.startsWith('I') || bcText.startsWith('1'))) {
                        bcText = bcText.substring(1);
                    }
                    if (bcText.length === 17) {
                        lockAndCapture(bcText, "Barcode");
                        return;
                    }
                }
            } catch (barcodeErr) {
                // No barcode in this frame; proceed to OCR
            }
        }

        // B. Apply Contrast Enhancer for Plain Text / Stamped Plates
        enhanceContrast(ctx, scannerCanvas.width, scannerCanvas.height);

        // C. Run Tuned OCR
        const { data: { text } } = await ocrWorker.recognize(scannerCanvas);
        let raw = text.toUpperCase().replace(/[^A-Z0-9]/g, '');

        if (raw.length > 0) {
            scannerLiveRead.textContent = `Reading: ${raw.slice(0, 17)} (${raw.length}/17)`;
        }

        // Search for 17-character sequence
        const matches = raw.match(/[A-Z0-9]{17}/g);
        if (matches && matches.length > 0) {
            for (let candidate of matches) {
                // Auto-correct common OCR mix-ups (I -> 1, O -> 0, Q -> 0)
                candidate = candidate
                    .replace(/I/g, '1')
                    .replace(/O/g, '0')
                    .replace(/Q/g, '0');

                const check = validateVIN(candidate);
                if (check.valid) {
                    lockAndCapture(candidate, "Text");
                    return;
                }
            }
        }

    } catch (err) {
        console.error("Analysis error:", err);
    } finally {
        isProcessingFrame = false;
    }
}

// Trigger capture lock
function lockAndCapture(vin, source) {
    scannerReticle.classList.add("locked");
    scannerLiveRead.textContent = `✅ ${source} Locked: ${vin}`;

    if (navigator.vibrate) navigator.vibrate(200);

    vinInputField.value = vin;

    setTimeout(() => {
        stopLiveScanner();
    }, 450);
}

if (cameraBtn) cameraBtn.addEventListener("click", startLiveScanner);
if (closeScannerBtn) closeScannerBtn.addEventListener("click", stopLiveScanner);
if (forceSnapBtn) forceSnapBtn.addEventListener("click", analyzeFrame);
