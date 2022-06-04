let address_list = [];

let distances = {
    origin: "",
    destinations: []
    // {name:"", travel_time:""},
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({address_list});
    chrome.storage.sync.set({distances});
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.name === "distance") {
        const apiKey = "API-KEY";
        let params = `origin=${request.origin}&destination=${request.destination}&mode=${request.transport_mode}`
        if (request.arrival_time !== "") {
            params += `&arrival_time=${request.arrival_time}`
        }
        const url = `https://maps.googleapis.com/maps/api/directions/json?${params}&language=en&key=${apiKey}`;

        fetch(url).then(function (response) {
            console.log(response);
            if (response.status !== 200) {
                console.log(`Error: ${response.status}`);
                return;
            }
            response.json().then(function (data) {
                sendResponse(data);
            });
        })
    }
    return true;
});