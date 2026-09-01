function decodeVIN() {

    const vin =
        document.getElementById("vin")
        .value
        .toUpperCase();

    let make = "Unknown";

    if (vin.startsWith("ZAR"))
        make = "Alfa Romeo";

    if (vin.startsWith("ZAM"))
        make = "Maserati";

    if (vin.startsWith("3C3"))
        make = "Fiat";

    document.getElementById("result")
        .innerHTML =
        `<h3>${make}</h3>`;
}
