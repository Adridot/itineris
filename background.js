let address_list = [{
    name: "John Doe", address: "37 rue ronald mcdonald 75002 Paris",
}, {
    name: "Jane Doe", address: "37 rue ronald mcdonald 75002 Paris",
}];

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