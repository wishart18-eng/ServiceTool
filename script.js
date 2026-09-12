// ==========================================
// SERVICETOOL - ADVISOR QUICK LOOKUP ENGINE
// ==========================================

const fallbackDB = {
  "ALFA ROMEO": {
    "GIULIA": { "2.0": [{ "id": "oil_service", "name": "Engine Oil & Filter Service", "intervalMiles": 10000, "intervalMonths": 12, "price": 298, "mandatory": true, "note": "Max interval: 10,000 miles or 1 year." }] },
    "STELVIO": { "2.0": [{ "id": "oil_service", "name": "Engine Oil & Filter Service", "intervalMiles": 10000, "intervalMonths": 12, "price": 298, "mandatory": true, "note": "10,000 miles or 1 year." }] }
  },
  "MASERATI": {
    "GHIBLI": { "3.0": [{ "id": "oil_service", "name": "Engine Oil & Filter (Maserati Spec)", "intervalMiles": 10000, "intervalMonths": 12, "price": 910, "mandatory": true, "note": "Annual service or 10,000 miles." }] },
    "LEVANTE": { "3.0": [{ "id": "oil_service", "name": "Engine Oil & Filter (Maserati Spec)", "intervalMiles": 10000, "intervalMonths": 12, "price": 910, "mandatory": true, "note": "Annual service or 10,000 miles." }] },
    "GRECALE": { "2.0": [{ "id": "oil_service", "name": "Engine Oil & Filter Service (MHEV)", "intervalMiles": 10000, "intervalMonths": 12, "price": 910, "mandatory": true, "note": "10,000 miles or 1 year." }] },
    "QUATTROPORTE": { "3.0": [{ "id": "oil_service", "name": "Engine Oil & Filter (Maserati Spec)", "intervalMiles": 10000, "intervalMonths": 12, "price": 910, "mandatory": true, "note": "Annual service or 10,000 miles." }] }
  },
  "FIAT": {
    "500X": { "1.3": [{ "id": "oil_service", "name": "Engine Oil & Filter Service", "intervalMiles": 10000, "intervalMonths": 12, "price": 275, "mandatory": true, "note": "10,000 miles or 1 year." }] },
    "500": { "1.4": [{ "id": "oil_service", "name": "Engine Oil & Filter (MultiAir Spec)", "intervalMiles": 8000, "intervalMonths": 12, "price": 275, "mandatory": true, "note": "MultiAir system requires strict oil maintenance." }] },
    "124 SPIDER": { "1.4": [{ "id": "oil_service", "name": "Engine Oil & Filter (0W-40 / 5W-40)", "intervalMiles": 10000, "intervalMonths": 12, "price": 275, "mandatory": true, "note": "10,000 miles or 1 year." }] }
  }
};

// Model Press Renders
const vehicleImages = {
  "ALFA ROMEO": {
    "GIULIA": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/2018_Alfa_Romeo_Giulia_Ti_Q4_2.0L_front_5.24.19.jpg/640px-2018_Alfa_Romeo_Giulia_Ti_Q4_2.0L_front_5.24.19.jpg",
    "STELVIO": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/2018_Alfa_Romeo_Stelvio_Ti_AWD_2.0L%2C_front_8.21.19.jpg/640px-2018_Alfa_Romeo_Stelvio_Ti_AWD_2.0L%2C_front_8.21.19.jpg",
    "TONALE": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Alfa_Romeo_Tonale_IAA_2023_1X7A0308.jpg/640px-Alfa_Romeo_Tonale_IAA_2023_1X7A0308.jpg"
  },
  "MASERATI": {
    "GHIBLI": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Maserati_Ghibli_III_front-1.jpg/640px-Maserati_Ghibli_III_front-1.jpg",
    "LEVANTE": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/2017_Maserati_Levante_V6_Automatic_3.0_Front.jpg/640px-2017_Maserati_Levante_V6_Automatic_3.0_Front.jpg",
    "GRECALE": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Maserati_Grecale_GT_IMG_7034.jpg/640px-Maserati_Grecale_GT_IMG_7034.jpg",
    "QUATTROPORTE": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Maserati_Quattroporte_VI_GTS_front_20130907.jpg/640px-Maserati_Quattroporte_VI_GTS_front_20130907.jpg"
  },
  "FIAT": {
    "500X": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/2016_Fiat_500X_Pop_1.6_Front.jpg/640px-2016_Fiat_500X_Pop_1.6_Front.jpg",
    "500": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Fiat_500_1.2_8V_Lounge_%28III%29_%E2%80%93_Frontansicht%2C_18._Mai_2013%2C_Ratingen.jpg/640px-Fiat_500_1.2_8V_Lounge_%28III%29_%E2%80%93_Frontansicht%2C_18._Mai_2013%2C_Ratingen.jpg",
    "124 SPIDER": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Fiat_124_Spider_Lusso_%28MultiAir%29_%E2%80%93_Frontansicht%2C_28._August_2016%2C_D%C3%BCsseldorf.jpg/640px-Fiat_124_Spider_Lusso_%28MultiAir%29_%E2%80%93_Frontansicht%2C_28._August_2016%2C_D%C3%BCsseldorf.jpg"
  }
};

function getVehicleImage(make, rawModel) {
    if (!vehicleImages[make]) return "";
    const models = vehicleImages[make];
    for (const key of Object.keys(models)) {
        if (rawModel.includes(key) || key.includes(rawModel)) {
            return models[key];
        }
    }
    return "";
}

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

// Render Output with Photo Grid & Error Safeguard
function renderOutput(data) {
    const resultContainer = document.getElementById("result");
    const pricedTotal = data.dueNow.reduce((sum, item) => sum + (item.price || 0), 0);
    const carImageUrl = getVehicleImage(data.make, data.model);

    let html = `
        <div class="vehicle-result">
            <h2>
                ${data.year} ${data.make} ${data.model}
                <button type="button" id="openStoryModalBtn" class="btn-story-action">💬 Advisor Pitch & SMS Story</button>
            </h2>

            <div class="vehicle-header-grid">
                <div class="vehicle-info-col">
                    <p><strong>VIN:</strong> ${data.vin}</p>
                    ${data.customerName ? `<p><strong>Customer:</strong> ${data.customerName}</p>` : ""}
                    <p><strong>Engine:</strong> ${data.engineDisplacement}L (${data.cylinders}-cylinder)</p>
                    <p><strong>Fuel:</strong> ${data.fuel}</p>
                    <p><strong>Transmission:</strong> ${data.transmission}</p>
                    <p><strong>Drive:</strong> ${data.driveType}</p>
                    <p><strong>Current Mileage:</strong> ${data.mileage.toLocaleString()} miles</p>
                    <p><strong>In-Service:</strong> ${data.inServiceLabel}</p>
                    <p><strong>Vehicle Age:</strong> ${data.age.years} years, ${data.age.months} months</p>
                </div>
                ${carImageUrl ? `
                <div class="vehicle-img-col">
                    <img src="${carImageUrl}" 
                         alt="${data.year} ${data.make} ${data.model}" 
                         class="vehicle-hero-img"
                         referrerpolicy="no-referrer"
                         onerror="this.parentElement.style.display='none'">
                </div>` : ""}
            </div>

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
        const clientStr = data.customerName ? `CUSTOMER: ${data.customerName}\n`
