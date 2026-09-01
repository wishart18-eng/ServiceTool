async function decodeVIN() {

```
const vinInput = document.getElementById("vin");
const result = document.getElementById("result");

const vin = vinInput.value.trim().toUpperCase();

if (vin.length !== 17) {
    result.innerHTML = "<h2>Please enter a valid 17-character VIN.</h2>";
    return;
}

result.innerHTML = "<p>Decoding VIN...</p>";

try {

    const response = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`
    );

    if (!response.ok) {
        throw new Error("VIN API request failed.");
    }

    const data = await response.json();

    if (!data.Results || data.Results.length === 0) {
        result.innerHTML = "<h2>No vehicle information found.</h2>";
        return;
    }

    const vehicle = data.Results[0];

    const make = vehicle.Make || "Unknown";
    const model = vehicle.Model || "Unknown";
    const year = vehicle.ModelYear || "Unknown";
    const trim = vehicle.Trim || "Unknown";
    const engine = vehicle.EngineModel || "Unknown";
    const engineSize = vehicle.DisplacementL || "Unknown";
    const cylinders = vehicle.EngineCylinders || "Unknown";
    const fuel = vehicle.FuelTypePrimary || "Unknown";
    const transmission = vehicle.TransmissionStyle || "Unknown";
    const driveType = vehicle.DriveType || "Unknown";
    const body = vehicle.BodyClass || "Unknown";
    const plant = vehicle.PlantCity || "Unknown";
    const country = vehicle.PlantCountry || "Unknown";

    result.innerHTML = `
        <div class="vehicle-result">

            <h2>${year} ${make} ${model}</h2>

            <p><strong>VIN:</strong> ${vin}</p>

            <hr>

            <p><strong>Trim:</strong> ${trim}</p>

            <p><strong>Engine:</strong> ${engine}</p>

            <p><strong>Engine Size:</strong> ${engineSize} L</p>

            <p><strong>Cylinders:</strong> ${cylinders}</p>

            <p><strong>Fuel:</strong> ${fuel}</p>

            <p><strong>Transmission:</strong> ${transmission}</p>

            <p><strong>Drive Type:</strong> ${driveType}</p>

            <p><strong>Body:</strong> ${body}</p>

            <p><strong>Assembly:</strong> ${plant}, ${country}</p>

        </div>
    `;

} catch (error) {

    console.error(error);

    result.innerHTML = `
        <h2>Unable to decode VIN.</h2>
        <p>Please check the VIN and try again.</p>
    `;
}
```

}
