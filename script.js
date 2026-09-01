function decodeVIN() {
    const vin = document
        .getElementById("vin")
        .value
        .toUpperCase();

    let make = "Unknown";

    if (vin.startsWith("ZAR")) {
        make = "Alfa Romeo";
    } else if (vin.startsWith("ZAM")) {
        make = "Maserati";
    } else if (vin.startsWith("3C3")) {
        make = "Fiat";
    }

    document.getElementById("result").innerHTML =
        "<h2>" + make + "</h2>";
}
