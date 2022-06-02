window.onload = function () {
    updateTable()
}

function clearTable() {
    document.getElementById("results_table_body").innerHTML = "";
}

function clearDestinations() {
    chrome.storage.sync.set({distances: {origin: "", destinations: []}});
    updateTable();
}

function getDate(hours, minutes) {
    let today = new Date();
    today.setHours(hours);
    today.setMinutes(minutes);

    return Math.round(today.getTime()/1000);
}

function distancesToHTML(distances) {
    clearTable();
    for (let destination of distances.destinations) {
        let row = document.createElement("tr");
        let name_cell = document.createElement("td");
        let travel_time_cell = document.createElement("td");
        name_cell.innerHTML = destination.name;
        travel_time_cell.innerHTML = destination.travel_time;
        row.appendChild(name_cell);
        row.appendChild(travel_time_cell);
        document.getElementById("results_table_body").appendChild(row);
    }
}

function updateTable() {
    chrome.storage.sync.get("distances", ({distances}) => {
        if (distances.origin === "") {
            document.getElementById("results_container").classList.add('is-hidden');
        } else {
            document.getElementById("results_container").classList.remove('is-hidden');
            document.getElementById("current_origin_address").innerHTML = `The selected address is: <b>${distances.origin}</b>`;
            distancesToHTML(distances);
        }
    });
}

document.getElementById("transport_mode_select").addEventListener("change", () => {
    let transport_mode = document.getElementById("transport_mode_select").value;
    if (transport_mode === "transit") {
        document.getElementById("departure_time_container").classList.remove('is-hidden');
    } else {
        document.getElementById("departure_time_container").classList.add('is-hidden');
    }
});

document.getElementById("setup_button").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
});

document.getElementById("address_button").addEventListener("click", () => {
    let address_input = document.getElementById("address");
    let address = address_input.value;
    if (address === "") {
        alert("Please fill in an address");
        return;
    }
    let transport_mode = document.getElementById("transport_mode_select").value;
    let departure_time = ""
    if (transport_mode === "transit") {
        let hour = document.getElementById("departure_hour_select").value;
        let minutes = document.getElementById("departure_minutes_select").value;
        departure_time = getDate(hour, minutes);
    }
    getTravelTimes(address, transport_mode, departure_time);
});

function getTravelTimes(origin, transport_mode, departure_time) {
    let destinations = []
    chrome.storage.sync.get("address_list", ({address_list}) => {
        for (let address_elem of address_list) {
            console.log(origin, address_elem.address, transport_mode, departure_time)
            let travel_time = extractTravelTime(origin, address_elem.address, transport_mode, departure_time);
            destinations.push({name: address_elem.name, travel_time: travel_time});
        }
    });
    chrome.storage.sync.get("distances", ({distances}) => {
        distances.origin = origin;
        distances.destinations = destinations;
        chrome.storage.sync.set({distances: distances});
    });
    updateTable();
}

async function extractTravelTime(origin, destination, transport_mode, departure_time) {
    const apiResponse = await callAPI(origin, destination, transport_mode, departure_time);
    console.log(apiResponse);
    return apiResponse.routes[0].legs[0].duration.text;
}


function callAPI(origin, destination, transport_mode, departure_time) {
    message = {
        name: "distance",
        origin: encodeURIComponent(origin),
        destination: encodeURIComponent(destination),
        transport_mode: encodeURIComponent(transport_mode),
        departure_time: encodeURIComponent(departure_time)
    }

    chrome.runtime.sendMessage(message, (response) => {
        return response;
    });
}