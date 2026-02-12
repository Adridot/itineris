![](assets/icons/64.png)
# Itineris 
### Find the travel time to many destinations from one place!

Chrome web store link: [https://chrome.google.com/webstore/detail/pffdkfppfngeiijdkcipdmpmabfkiapk](https://chrome.google.com/webstore/detail/pffdkfppfngeiijdkcipdmpmabfkiapk?authuser=0&hl=fr)

This browser extension will help you whenever you need to frequently research for traveling times between the same places.
The best example is when looking for a new place to live. You would want to know how long it takes to go from this fancy place you found online to work, to your parent's or friends houses.

The steps are very simple:
1. Go to the options page and add the frequent addresses. (provide enough details for the app to know the exact place you are looking for)
2. Find any address you want to check, open the extension, select the way of travelling, the time if needed, and enter the address !
3. Wait for a few seconds and... tadam! You will have your results.

## API setup (AWS Lambda + Google Maps)

The extension calls the AWS API endpoint from the background service worker.

### 1) Lambda environment variables

Set these variables on the Lambda function:

- `GOOGLE_API_PREFERRED=routes`
- `ENABLE_DIRECTIONS_FALLBACK=true`
- `GOOGLE_ROUTES_API_KEY=...` (recommended)
- `GOOGLE_DIRECTIONS_API_KEY=...` (fallback / legacy)
- `AUTHORIZED_ORIGINS=chrome-extension://<YOUR_EXTENSION_ID>`
- `AUTHORIZED_EXTENSION_IDS=<YOUR_EXTENSION_ID>`

Notes:
- `Directions API` is legacy. `Routes API` is preferred.
- You can keep both APIs enabled during transition.

### 2) API Gateway CORS

Configure CORS on your API Gateway route:

- Methods: `OPTIONS, POST`
- Allowed headers: `Content-Type, X-Extension-Id`
- Allowed origin: `chrome-extension://<YOUR_EXTENSION_ID>`

### 3) Chrome extension ID

The runtime ID is sent in header `X-Extension-Id`.
To keep a stable ID between builds, publish on Chrome Web Store (or use a fixed manifest key strategy).
