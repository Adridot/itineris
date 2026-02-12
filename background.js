chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get(["address_list", "distances"], (result) => {
        if (!result.address_list) {
            chrome.storage.sync.set({address_list: []});
        }
        if (!result.distances) {
            chrome.storage.sync.set({distances: {origin: "", destinations: []}});
        }
    });
});


function getDirection(origin, destination, transport_mode, arrival_time) {
    let body = {
        origin: origin,
        destination: destination,
        transport_mode: transport_mode,
        arrival_time: arrival_time
    }
    return fetch('https://na1x86jgj8.execute-api.eu-west-3.amazonaws.com/default/directionsSecurity', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    }).then(response => response.json())
        .then(data => {
            return data
        })
}

chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
    if (request.name === "distance") {
        getDirection(request.origin, request.destination, request.transport_mode, request.arrival_time)
            .then(response => {
                sendResponse(response);
            })
    }
    return true;
});
