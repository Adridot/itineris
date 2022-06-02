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

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({address_list});
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.name === "autocomplete") {
        const apiKey = "YOUR-API-KEY-HERE";
        const url = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`

        fetch(url).then(function (response) {
            if (response.status !== 200) {
                console.log(`Error: ${response.status}`);
                return;
            }
            response.text().then(function (text) {
                sendResponse(text);
            });
        })
    }
    return true;
});