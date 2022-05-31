let address_list = [
    {
        name: "John Doe",
        address: "37 rue ronald mcdonald 75002 Paris",
    },
    {
        name: "Jane Doe",
        address: "37 rue ronald mcdonald 75002 Paris",
    }
];

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({address_list});
});