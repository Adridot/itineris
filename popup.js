window.onload = function () {
    updateTable()
}

function clearTable() {
    document.getElementById("results_table_body").innerHTML = "";
}

function getDate(hours, minutes) {
    let today = new Date();
    today.setHours(hours);
    today.setMinutes(minutes);

    return Math.round(today.getTime() / 1000);
}

function toggleLoading() {
    document.getElementById("address_button").classList.toggle('is-loading');
}

function distancesToHTML(distances) {
    clearTable();
    for (let destination of distances.destinations) {
        let row = document.createElement("tr");
        let name_cell = document.createElement("td");
        let travel_time_cell = document.createElement("td");
        let open_maps_button_cell = document.createElement("td");

        name_cell.innerHTML = destination.name;
        travel_time_cell.innerHTML = destination.travel_time;
        open_maps_button_cell.innerHTML = `
            <button id='open_maps_${destination.id}' class='open_maps_button button is-info is-outlined'>
                <span>Open in Maps</span>
                <span class='icon is-small'>
                <i class='fa-solid fa-map-marked-alt'></i>
                </span>
            </button>`;
        open_maps_button_cell.classList.add("has-text-centered");

        row.appendChild(name_cell);
        row.appendChild(travel_time_cell);
        row.appendChild(open_maps_button_cell);
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
    handleOpenMapsButton()
}

function getMapsURL(origin, destination, transport_mode) {
    let params = `origin=${origin}&destination=${destination}&travelmode=${transport_mode}`
    return `https://www.google.com/maps/dir/?api=1&${params}`;
}

function replaceEventListener(distances, destination, transport_mode) {
    let button = document.getElementById(`open_maps_${destination.id}`);

    // Clone the button to remove all event listeners
    let buttonClone = button.cloneNode(true);
    button.parentNode.replaceChild(buttonClone, button);

    // Get the new button to add the right event listener
    let newButton = document.getElementById(`open_maps_${destination.id}`);
    newButton.addEventListener("click", () => {
        window.open(getMapsURL(distances.origin, destination.address, transport_mode), "_blank");
    });
}

function handleOpenMapsButton() {
    let transport_mode = document.getElementById("transport_mode_select").value;
    chrome.storage.sync.get("distances", ({distances}) => {
        for (let destination of distances.destinations) {
            replaceEventListener(distances, destination, transport_mode)
        }
    });
}


async function callAPI(origin, destination, transport_mode, arrival_time) {
    message = {
        name: "distance",
        origin: encodeURIComponent(origin),
        destination: encodeURIComponent(destination),
        transport_mode: encodeURIComponent(transport_mode),
        arrival_time: encodeURIComponent(arrival_time)
    }
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, (response) => {
            resolve(response);
        });
    });
}

async function extractTravelTime(origin, destination, transport_mode, arrival_time) {
    const apiResponse = await callAPI(origin, destination, transport_mode, arrival_time);
    if (apiResponse.status === "OK") {
        return apiResponse.routes[0].legs[0].duration.text;
    } else {
        return "Error: " + apiResponse.status;
    }
}

function getTravelTimes(origin, transport_mode, arrival_time) {
    let destinations = [];
    chrome.storage.sync.get("address_list", async ({address_list}) => {
        if (address_list.length === 0) {
            alert("No addresses have been added yet.\nPlease go to the options page to add some.");
        } else {
            toggleLoading();
            for (let address_elem of address_list) {
                let travel_time = await extractTravelTime(origin, address_elem.address, transport_mode, arrival_time);
                destinations.push({
                    id: address_elem.id,
                    name: address_elem.name,
                    address: address_elem.address,
                    travel_time: travel_time
                });
            }
            await chrome.storage.sync.set({distances: {origin: origin, destinations: destinations}}).then(() => {
                updateTable();
                toggleLoading();
            });
        }
    });
}

document.getElementById("transport_mode_select").addEventListener("change", () => {
    let transport_mode = document.getElementById("transport_mode_select").value;
    if (transport_mode === "transit") {
        document.getElementById("arrival_time_selects").removeAttribute("disabled");
    } else {
        document.getElementById("arrival_time_selects").setAttribute("disabled", "disabled");
    }
    handleOpenMapsButton();
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
    let arrival_time = ""
    if (transport_mode === "transit") {
        let hour = document.getElementById("arrival_hour_select").value;
        let minutes = document.getElementById("arrival_minutes_select").value;
        arrival_time = getDate(hour, minutes);
    }
    address_input.value = "";
    getTravelTimes(address, transport_mode, arrival_time);
});