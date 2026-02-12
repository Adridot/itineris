const API_ENDPOINT = "https://na1x86jgj8.execute-api.eu-west-3.amazonaws.com/default/directionsSecurity";
const CACHE_STORAGE_KEY = "api_cache";
const CACHE_ENTRY_PREFIX = "api_cache_entry::";
const MAX_CACHE_ENTRIES = 250;

const DEFAULT_SETTINGS = {
    default_transport_mode: "transit",
    default_time_reference: "arrival",
    default_hour: "08",
    default_minutes: "00",
    max_duration_minutes: "",
    cache_ttl_minutes: 10
};

let cacheQueue = Promise.resolve();

chrome.runtime.onInstalled.addListener(async () => {
    await ensureDefaultStorage();
});

chrome.runtime.onStartup.addListener(async () => {
    await ensureDefaultStorage();
});

async function syncGet(keys) {
    return new Promise((resolve) => {
        chrome.storage.sync.get(keys, resolve);
    });
}

async function syncSet(value) {
    return new Promise((resolve) => {
        chrome.storage.sync.set(value, resolve);
    });
}

async function localGet(keys) {
    return new Promise((resolve) => {
        chrome.storage.local.get(keys, resolve);
    });
}

async function localSet(value) {
    return new Promise((resolve) => {
        chrome.storage.local.set(value, resolve);
    });
}

async function localRemove(keys) {
    return new Promise((resolve) => {
        chrome.storage.local.remove(keys, resolve);
    });
}

function isValidDistances(distances) {
    return Boolean(
        distances &&
        typeof distances === "object" &&
        typeof distances.origin === "string" &&
        Array.isArray(distances.destinations)
    );
}

function mergeSettings(settings) {
    if (!settings || typeof settings !== "object") {
        return { ...DEFAULT_SETTINGS };
    }
    return { ...DEFAULT_SETTINGS, ...settings };
}

async function ensureDefaultStorage() {
    const syncData = await syncGet([
        "address_list",
        "distances",
        "origin_history",
        "favorite_origins",
        "user_settings"
    ]);

    const updates = {};
    if (!Array.isArray(syncData.address_list)) {
        updates.address_list = [];
    }
    if (!isValidDistances(syncData.distances)) {
        updates.distances = { origin: "", destinations: [] };
    }
    if (!Array.isArray(syncData.origin_history)) {
        updates.origin_history = [];
    }
    if (!Array.isArray(syncData.favorite_origins)) {
        updates.favorite_origins = [];
    }

    const mergedSettings = mergeSettings(syncData.user_settings);
    const settingsChanged = JSON.stringify(mergedSettings) !== JSON.stringify(syncData.user_settings || {});
    if (settingsChanged) {
        updates.user_settings = mergedSettings;
    }

    if (Object.keys(updates).length > 0) {
        await syncSet(updates);
    }
}

function getCacheKey(body) {
    return JSON.stringify({
        origin: body.origin,
        destination: body.destination,
        transport_mode: body.transport_mode,
        time_reference: body.time_reference,
        time_value: body.time_value,
        arrival_time: body.arrival_time,
        departure_time: body.departure_time
    });
}

function getCacheEntryStorageKey(cacheKey) {
    return `${CACHE_ENTRY_PREFIX}${encodeURIComponent(cacheKey)}`;
}

function withCacheLock(task) {
    const run = cacheQueue.then(() => task());
    cacheQueue = run.catch(() => {});
    return run;
}

function isValidCacheEntry(entry) {
    return Boolean(
        entry &&
        typeof entry === "object" &&
        !Array.isArray(entry) &&
        typeof entry.timestamp === "number" &&
        typeof entry.request_key === "string" &&
        entry.payload &&
        typeof entry.payload === "object"
    );
}

async function getCachedEntry(cacheKey, ttlMs) {
    const storageKey = getCacheEntryStorageKey(cacheKey);
    const data = await localGet([storageKey]);
    const entry = data[storageKey];
    const now = Date.now();

    if (!isValidCacheEntry(entry) || entry.request_key !== cacheKey) {
        if (entry !== undefined) {
            await localRemove([storageKey]);
        }
        return null;
    }

    if (now - entry.timestamp > ttlMs) {
        await localRemove([storageKey]);
        return null;
    }

    return entry;
}

async function writeCachedEntry(cacheKey, payload) {
    const storageKey = getCacheEntryStorageKey(cacheKey);
    await localSet({
        [storageKey]: {
            timestamp: Date.now(),
            request_key: cacheKey,
            payload
        }
    });
}

async function pruneCacheEntries(ttlMs) {
    const allData = await localGet(null);
    const now = Date.now();
    const freshEntries = [];
    const keysToDelete = [];

    for (const [storageKey, value] of Object.entries(allData)) {
        if (!storageKey.startsWith(CACHE_ENTRY_PREFIX)) {
            continue;
        }
        if (!isValidCacheEntry(value)) {
            keysToDelete.push(storageKey);
            continue;
        }
        if (now - value.timestamp > ttlMs) {
            keysToDelete.push(storageKey);
            continue;
        }
        freshEntries.push({
            storageKey,
            timestamp: value.timestamp
        });
    }

    // Legacy cache format cleanup (single giant object).
    if (allData[CACHE_STORAGE_KEY] !== undefined) {
        keysToDelete.push(CACHE_STORAGE_KEY);
    }

    freshEntries.sort((left, right) => right.timestamp - left.timestamp);
    for (const entry of freshEntries.slice(MAX_CACHE_ENTRIES)) {
        keysToDelete.push(entry.storageKey);
    }

    if (keysToDelete.length > 0) {
        await localRemove([...new Set(keysToDelete)]);
    }
}

async function clearAllCacheEntries() {
    const allData = await localGet(null);
    const keysToDelete = [];

    for (const key of Object.keys(allData)) {
        if (key === CACHE_STORAGE_KEY || key.startsWith(CACHE_ENTRY_PREFIX)) {
            keysToDelete.push(key);
        }
    }

    if (keysToDelete.length > 0) {
        await localRemove(keysToDelete);
    }
}

async function fetchDirection(body) {
    return fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Extension-Id": chrome.runtime.id
        },
        body: JSON.stringify(body)
    }).then(async (response) => {
        let payload = {};
        try {
            payload = await response.json();
        } catch (error) {
            payload = {};
        }

        if (!response.ok) {
            return {
                status: payload.status || "REQUEST_FAILED",
                error_message: payload.error || payload.error_message || `HTTP error: ${response.status}`
            };
        }
        return payload;
    }).catch((error) => {
        console.error("API request failed:", error);
        return { status: "REQUEST_FAILED", error_message: error.message };
    });
}

function normalizeRequestBody(request) {
    const body = {
        origin: request.origin,
        destination: request.destination,
        transport_mode: request.transport_mode,
        time_reference: request.time_reference || "none",
        time_value: request.time_value || "",
        arrival_time: request.arrival_time || "",
        departure_time: request.departure_time || ""
    };

    if (body.time_reference === "arrival" && body.time_value) {
        body.arrival_time = body.time_value;
        body.departure_time = "";
    }
    if (body.time_reference === "departure" && body.time_value) {
        body.departure_time = body.time_value;
        body.arrival_time = "";
    }
    if (body.time_reference === "none") {
        body.arrival_time = "";
        body.departure_time = "";
    }

    return body;
}

async function getDirection(request) {
    const body = normalizeRequestBody(request);
    const { user_settings } = await syncGet("user_settings");
    const settings = mergeSettings(user_settings);
    const ttlMinutes = Number(settings.cache_ttl_minutes);
    const normalizedTtlMinutes = Number.isFinite(ttlMinutes) && ttlMinutes > 0 ? ttlMinutes : DEFAULT_SETTINGS.cache_ttl_minutes;
    const ttlMs = normalizedTtlMinutes * 60 * 1000;

    const cacheKey = getCacheKey(body);
    const cachedEntry = await withCacheLock(async () => {
        const cacheEntry = await getCachedEntry(cacheKey, ttlMs);
        await pruneCacheEntries(ttlMs);
        return cacheEntry;
    });

    if (cachedEntry) {
        return {
            ...cachedEntry.payload,
            cached: true
        };
    }

    const livePayload = await fetchDirection(body);

    if (livePayload.status === "OK") {
        await withCacheLock(async () => {
            await writeCachedEntry(cacheKey, livePayload);
            await pruneCacheEntries(ttlMs);
        });
    }

    return {
        ...livePayload,
        cached: false
    };
}

async function clearCache() {
    await withCacheLock(async () => {
        await clearAllCacheEntries();
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.name === "distance") {
        getDirection(request)
            .then((response) => {
                sendResponse(response);
            })
            .catch((error) => {
                sendResponse({ status: "REQUEST_FAILED", error_message: error.message });
            });
        return true;
    }

    if (request.name === "clear_cache") {
        clearCache()
            .then(() => sendResponse({ status: "OK" }))
            .catch((error) => sendResponse({ status: "REQUEST_FAILED", error_message: error.message }));
        return true;
    }

    return false;
});
