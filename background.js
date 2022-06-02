let address_list = [
    {
        id: 1,
        name: "Maison",
        address: "37 rue Rémy Dumoncel 77210 Avon",
    },
    {
        id: 2,
        name: "Ecole",
        address: "CYTech Cergy",
    },
    {
        id: 3,
        name: "Travail SG",
        address: "Tours Société Générale La Défense",
    },
];

let distances = {
    // origin: "",
    origin: "37 rue Rémy Dumoncel 77210 Avon",
    destinations: [
        {
            name: "Maison",
            travel_time: "1 hour 30 minutes",
        },
        {
            name: "Ecole",
            travel_time: "45 minutes",
        },
        {
            name: "Travail SG",
            travel_time: "37 minutes",
        },
        {
            name: "Travail SG",
            travel_time: "37 minutes",
        },
    ],
    //destinations: {name:"", travel_time:""},
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({address_list});
    chrome.storage.sync.set({distances});
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.name === "distance") {
        const apiKey = "YOUR-API-KEY-HERE";
        let params = `origin=${request.origin}&destination=${request.destination}&mode=${request.transport_mode}`
        if (request.departure_time !== "") {
            params += `&departure_time=${request.departure_time}`
        }
        const url = `https://maps.googleapis.com/maps/api/directions/json?${params}&key=${apiKey}`;

        fetch(url).then(function (response) {
            console.log(response);
            if (response.status !== 200) {
                console.log(`Error: ${response.status}`);
                return;
            }
            response.json().then(function (data) {
                console.log(data);
                sendResponse(data);
            });
        })
    }
    return true;
});