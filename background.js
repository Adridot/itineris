let address_list = [];

let distances = {
    origin: "",
    destinations: []
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({address_list});
    chrome.storage.sync.set({distances});
});


async function getDirection(origin, destination, transport_mode, arrival_time) {
    let body = {
        origin: origin,
        destination: destination,
        transport_mode: transport_mode,
        arrival_time: arrival_time
    }
    return fetch('https://eyjh0bdqz4.execute-api.us-east-1.amazonaws.com/default/getDirections', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        mode: 'no-cors',
        body: JSON.stringify(body)
    })
}

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.name === "distance") {
        let response = await getDirection(request.origin, request.destination, request.transport_mode, request.arrival_time)
        console.log(await response.json())
        sendResponse(await response.json())
    }
});
