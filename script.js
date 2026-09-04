// ==========================================
// SERVICETOOL
// 2022 ALFA ROMEO GIULIA 2.0L
// Maintenance Schedule Prototype
// ==========================================

const maintenanceSchedule = [

    {
        name: "Engine oil and oil filter",
        intervalMiles: 10000,
        intervalYears: 1,
        mandatory: true,
        note: "Maximum factory interval: 10,000 miles or 1 year."
    },

    {
        name: "Brake fluid",
        intervalYears: 2,
        mandatory: true,
        note: "Replace every 2 years regardless of mileage."
    },

    {
        name: "Spark plugs",
        intervalMiles: 60000,
        mandatory: true,
        note: "NAFTA market interval: 60,000 miles. Yearly intervals do not apply."
    },

    {
        name: "SOS backup battery",
        intervalYears: 5,
        mandatory: true,
        note: "Replace every 5 years regardless of mileage, if equipped."
    },

    {
        name: "Engine air cleaner",
        intervalMiles: 30000,
        mandatory: true,
        note: "Replace according to the factory maintenance schedule."
    },

    {
        name: "Cabin air filter",
        intervalMiles: 20000,
        mandatory: false,
        note: "Factory schedule alternates recommended and mandatory replacement."
    },

    {
        name: "Transfer case oil",
        intervalMiles: 80000,
        mandatory: true,
        note: "AWD models only."
    },

    {
        name: "Accessory drive belt",
        intervalMiles: 60000,
        mandatory: true,
        note: "Replace according to the factory maintenance schedule."
    },

    {
        name: "Engine coolant",
        intervalMiles: 150000,
        intervalYears: 10,
        mandatory: true,
        note: "Replace at 150,000 miles or 10 years."
    }

];


// ==========================================
// CALCULATE AGE OF VEHICLE
// ==========================================

function calculateVehicleAge(inServiceDate) {

    const startDate = new Date(inServiceDate + "T00:00:00");
    const today = new Date();

    let years = today.getFullYear() - startDate.getFullYear();
    let months = today.getMonth() - startDate.getMonth();

    if (
        months < 0 ||
        (
            months === 0 &&
            today.getDate() < startDate.getDate()
        )
    ) {
        years--;
        months += 12;
    }

    if (months < 0) {
        months += 12;
    }

    return {
        years: years,
        months: months
    };
}


// ==========================================
// VIN DECODER
// ==========================================

async function decodeVIN() {

    const vinInput = document.getElementById("vin");
    const mileageInput = document.getElementById("mileage");
    const dateInput = document.getElementById("inServiceDate");
    const result = document.getElementById("result");

    const vin = vinInput.value.trim().toUpperCase();
    const mileage = Number(mileageInput.value);
    const inServiceDate = dateInput.value;


    // ------------------------------------------
    // Validate VIN
    // ------------------------------------------

    if (vin.length !== 17) {

        result.innerHTML = `
            <h2>Please enter a valid 17-character VIN.</h2>
        `;

        return;
    }


    // ------------------------------------------
    // Validate mileage
    // ------------------------------------------

    if (!mileage || mileage < 0) {

        result.innerHTML = `
            <h2>Please enter the current mileage.</h2>
        `;

        return;
    }


    // ------------------------------------------
    // Validate date
    // ------------------------------------------

    if (!inServiceDate) {

        result.innerHTML = `
            <h2>Please enter the vehicle's in-service date.</h2>
        `;

        return;
    }


    result.innerHTML = `
        <p>Decoding vehicle and calculating maintenance...</p>
    `;


    try {

        // ==========================================
        // NHTSA VIN API
        // ==========================================

        const response = await fetch(
            `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`
        );


        if (!response.ok) {

            throw new Error("VIN API request failed.");

        }


        const data = await response.json();


        if (!data.Results || data.Results.length === 0) {

            result.innerHTML = `
                <h2>No vehicle information found.</h2>
            `;

            return;

        }


        const vehicle = data.Results[0];


        // ==========================================
        // VEHICLE INFORMATION
        // ==========================================

        const make = vehicle.Make || "Unknown";
        const model = vehicle.Model || "Unknown";
        const year = vehicle.ModelYear || "Unknown";
        const engineSize = vehicle.DisplacementL || "Unknown";
        const cylinders = vehicle.EngineCylinders || "Unknown";
        const driveType = vehicle.DriveType || "Unknown";
        const fuel = vehicle.FuelTypePrimary || "Unknown";
        const transmission = vehicle.TransmissionStyle || "Unknown";


        // ==========================================
        // VEHICLE AGE
        // ==========================================

        const age = calculateVehicleAge(inServiceDate);


        // ==========================================
        // MAINTENANCE CALCULATION
        // ==========================================

        let dueNow = [];
        let upcoming = [];


        for (const service of maintenanceSchedule) {


            // --------------------------------------
            // TIME-BASED SERVICE
            // --------------------------------------

            if (service.intervalYears) {

                const intervalYears = service.intervalYears;

                if (age.years >= intervalYears) {

                    dueNow.push({

                        ...service,

                        reason:
                            `Time interval exceeded (${intervalYears} year${intervalYears > 1 ? "s" : ""}).`

                    });

                }

            }


            // --------------------------------------
            // MILEAGE-BASED SERVICE
            // --------------------------------------

            if (service.intervalMiles) {

                const interval = service.intervalMiles;


                // Vehicle has reached the interval
                if (mileage >= interval) {

                    const lastInterval =
                        Math.floor(mileage / interval) * interval;


                    dueNow.push({

                        ...service,

                        reason:
                            `Vehicle has reached ${lastInterval.toLocaleString()} miles.`

                    });

                }


                // Calculate next mileage interval
                const nextMileage =
                    (Math.floor(mileage / interval) + 1) * interval;


                // Show things within the next 10,000 miles
                if (
                    nextMileage > mileage &&
                    nextMileage <= mileage + 10000
                ) {

                    upcoming.push({

                        ...service,

                        nextMileage: nextMileage

                    });

                }

            }

        }


        // ==========================================
        // REMOVE DUPLICATES
        // ==========================================

        dueNow = dueNow.filter(
            (service, index, self) =>
                index === self.findIndex(
                    item => item.name === service.name
                )
        );


        upcoming = upcoming.filter(
            (service, index, self) =>
                index === self.findIndex(
                    item => item.name === service.name
                )
        );


        // ==========================================
        // BUILD RESULT
        // ==========================================

        let html = `

            <div class="vehicle-result">

                <h2>
                    ${year} ${make} ${model}
                </h2>

                <p>
                    <strong>VIN:</strong>
                    ${vin}
                </p>

                <p>
                    <strong>Engine:</strong>
                    ${engineSize} L ${cylinders}-cylinder
                </p>

                <p>
                    <strong>Fuel:</strong>
                    ${fuel}
                </p>

                <p>
                    <strong>Transmission:</strong>
                    ${transmission}
                </p>

                <p>
                    <strong>Drive:</strong>
                    ${driveType}
                </p>

                <p>
                    <strong>Current Mileage:</strong>
                    ${mileage.toLocaleString()} miles
                </p>

                <p>
                    <strong>In-Service Date:</strong>
                    ${inServiceDate}
                </p>

                <p>
                    <strong>Vehicle Age:</strong>
                    ${age.years} years, ${age.months} months
                </p>

                <hr>

                <h2>
                    Maintenance
                </h2>

        `;


        // ==========================================
        // DUE NOW
        // ==========================================

        if (dueNow.length > 0) {

            html += `

                <h3>
                    🔴 Due / Previously Due
                </h3>

            `;


            for (const service of dueNow) {

                html += `

                    <div>

                        <p>
                            <strong>
                                ${service.name}
                            </strong>
                        </p>

                        <p>
                            <strong>Why:</strong>
                            ${service.reason}
                        </p>

                        <p>
                            ${service.note}
                        </p>

                    </div>

                    <hr>

                `;

            }

        } else {

            html += `

                <h3>
                    🟢 No maintenance currently due
                </h3>

            `;

        }


        // ==========================================
        // UPCOMING
        // ==========================================

        if (upcoming.length > 0) {

            html += `

                <h3>
                    🟡 Coming Up
                </h3>

            `;


            for (const service of upcoming) {

                html += `

                    <p>

                        <strong>
                            ${service.name}
                        </strong>

                        —
                        ${service.nextMileage.toLocaleString()}
                        miles

                    </p>

                `;

            }

        }


        // ==========================================
        // PROTOTYPE NOTICE
        // ==========================================

        html += `

            <hr>

            <p>
                <strong>ServiceTool Prototype</strong>
            </p>

            <p>
                Schedule currently loaded:
                2022 Alfa Romeo Giulia 2.0L.
            </p>

            <p>
                Service history will be added later.
            </p>

            </div>

        `;


        result.innerHTML = html;


    } catch (error) {

        console.error("VIN decoding error:", error);


        result.innerHTML = `

            <h2>
                Unable to decode VIN.
            </h2>

            <p>
                Please check the VIN and try again.
            </p>

        `;

    }

}


// ==========================================
// CONNECT BUTTON
// ==========================================

document
    .getElementById("decodeButton")
    .addEventListener("click", decodeVIN);
