const DEFAULT_SETTINGS = {
    default_transport_mode: "transit",
    default_time_reference: "arrival",
    default_hour: "08",
    default_minutes: "00",
    max_duration_minutes: "",
    cache_ttl_minutes: 10
};

const POPUP_SIZE_LIMITS = {
    minWidth: 420,
    idealWidthRatio: 0.34,
    maxWidth: 760,
    minHeight: 480,
    maxHeight: 820,
    idealHeightRatio: 0.82
};

const appState = {
    settings: { ...DEFAULT_SETTINGS },
    distances: null,
    favoriteOrigins: [],
    originHistory: [],
    bannerTimerId: null
};

const elements = {
    statusChip: document.getElementById("status_chip"),
    banner: document.getElementById("message_banner"),
    addressInput: document.getElementById("address"),
    favoriteButton: document.getElementById("favorite_origin_button"),
    suggestions: document.getElementById("origin_suggestions"),
    favoriteList: document.getElementById("favorite_origins_list"),
    transportMode: document.getElementById("transport_mode_select"),
    timeReference: document.getElementById("time_reference_select"),
    hourSelect: document.getElementById("arrival_hour_select"),
    minuteSelect: document.getElementById("arrival_minutes_select"),
    maxDurationFilter: document.getElementById("max_duration_filter"),
    computeButton: document.getElementById("address_button"),
    setupButton: document.getElementById("setup_button"),
    resultsContainer: document.getElementById("results_container"),
    emptyState: document.getElementById("results_empty_state"),
    originLine: document.getElementById("current_origin_address"),
    resultsMeta: document.getElementById("results_meta"),
    resultsBody: document.getElementById("results_table_body")
};

document.addEventListener("DOMContentLoaded", () => {
    applyPopupLayoutBounds();
    init().catch((error) => {
        console.error("Popup initialization failed:", error);
        showBanner("error", error.message || "Initialization failed.");
        setStatus("error");
    });
});

function t(key, variables) {
    return window.i18n.t(key, variables);
}

function clampNumber(min, value, max) {
    return Math.max(min, Math.min(max, value));
}

function applyPopupLayoutBounds() {
    const screenWidth = Number(window.screen && window.screen.availWidth);
    const screenHeight = Number(window.screen && window.screen.availHeight);

    if (Number.isFinite(screenWidth) && screenWidth > 0) {
        const computedWidth = clampNumber(
            POPUP_SIZE_LIMITS.minWidth,
            Math.round(screenWidth * POPUP_SIZE_LIMITS.idealWidthRatio),
            POPUP_SIZE_LIMITS.maxWidth
        );
        document.documentElement.style.setProperty("--popup-width", `${computedWidth}px`);
    }

    if (Number.isFinite(screenHeight) && screenHeight > 0) {
        const computedHeight = clampNumber(
            POPUP_SIZE_LIMITS.minHeight,
            Math.round(screenHeight * POPUP_SIZE_LIMITS.idealHeightRatio),
            POPUP_SIZE_LIMITS.maxHeight
        );
        document.documentElement.style.setProperty("--popup-max-height", `${computedHeight}px`);
    }
}

async function init() {
    populateTimeSelects();
    bindEvents();

    const data = await syncGet(["distances", "origin_history", "favorite_origins", "user_settings"]);
    appState.settings = mergeSettings(data.user_settings);
    appState.originHistory = Array.isArray(data.origin_history) ? data.origin_history : [];
    appState.favoriteOrigins = Array.isArray(data.favorite_origins) ? data.favorite_origins : [];
    appState.distances = data.distances && typeof data.distances === "object" ? data.distances : null;

    applyTranslations();
    applySettingsToControls();
    renderFavoriteOrigins();
    renderSuggestions();
    updateFavoriteButtonState();

    if (appState.distances && appState.distances.origin) {
        renderDistances(appState.distances);
    } else {
        setStatus("idle");
    }
}

function bindEvents() {
    elements.addressInput.addEventListener("input", () => {
        updateFavoriteButtonState();
    });

    elements.addressInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            void handleComputeClick();
        }
    });

    elements.favoriteButton.addEventListener("click", () => {
        void toggleFavoriteOrigin();
    });

    elements.favoriteList.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-origin]");
        if (!button) {
            return;
        }
        elements.addressInput.value = button.dataset.origin || "";
        updateFavoriteButtonState();
    });

    elements.transportMode.addEventListener("change", () => {
        handleTransportChange();
        void persistControlSettings();
    });

    elements.timeReference.addEventListener("change", () => {
        updateTimeControlsAvailability();
        void persistControlSettings();
    });

    elements.hourSelect.addEventListener("change", () => {
        void persistControlSettings();
    });

    elements.minuteSelect.addEventListener("change", () => {
        void persistControlSettings();
    });

    elements.maxDurationFilter.addEventListener("change", () => {
        void persistControlSettings();
        renderDistances(appState.distances);
    });

    elements.setupButton.addEventListener("click", () => {
        chrome.runtime.openOptionsPage();
    });

    elements.computeButton.addEventListener("click", () => {
        void handleComputeClick();
    });

    elements.resultsBody.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-open-maps]");
        if (!button) {
            return;
        }
        const destination = button.dataset.destination;
        const origin = button.dataset.origin;
        const transportMode = button.dataset.transportMode;
        if (!destination || !origin || !transportMode) {
            return;
        }
        window.open(getMapsURL(origin, destination, transportMode), "_blank", "noopener");
    });
}

function mergeSettings(settings) {
    if (!settings || typeof settings !== "object") {
        return { ...DEFAULT_SETTINGS };
    }
    return { ...DEFAULT_SETTINGS, ...settings };
}

function applyTranslations() {
    window.i18n.apply(document);
}

function populateTimeSelects() {
    elements.hourSelect.textContent = "";
    for (let hour = 0; hour < 24; hour += 1) {
        const option = document.createElement("option");
        option.value = String(hour).padStart(2, "0");
        option.textContent = String(hour).padStart(2, "0");
        elements.hourSelect.appendChild(option);
    }

    elements.minuteSelect.textContent = "";
    for (let minute = 0; minute < 60; minute += 10) {
        const option = document.createElement("option");
        option.value = String(minute).padStart(2, "0");
        option.textContent = String(minute).padStart(2, "0");
        elements.minuteSelect.appendChild(option);
    }
}

function applySettingsToControls() {
    if (isTransportMode(elements.transportMode, appState.settings.default_transport_mode)) {
        elements.transportMode.value = appState.settings.default_transport_mode;
    }

    const validReferences = ["none", "departure", "arrival"];
    if (validReferences.includes(appState.settings.default_time_reference)) {
        elements.timeReference.value = appState.settings.default_time_reference;
    }

    if (elements.hourSelect.querySelector(`option[value="${appState.settings.default_hour}"]`)) {
        elements.hourSelect.value = appState.settings.default_hour;
    }

    if (elements.minuteSelect.querySelector(`option[value="${appState.settings.default_minutes}"]`)) {
        elements.minuteSelect.value = appState.settings.default_minutes;
    }

    elements.maxDurationFilter.value = appState.settings.max_duration_minutes || "";

    handleTransportChange(true);
}

function isTransportMode(selectNode, value) {
    return Boolean(selectNode.querySelector(`option[value="${value}"]`));
}

function handleTransportChange(silent) {
    const transportMode = elements.transportMode.value;
    const arrivalOption = elements.timeReference.querySelector('option[value="arrival"]');

    if (arrivalOption) {
        arrivalOption.disabled = transportMode !== "transit";
    }

    if (transportMode !== "transit" && elements.timeReference.value === "arrival") {
        elements.timeReference.value = "departure";
        if (!silent) {
            showBanner("info", t("arrived_option_disabled"), 3600);
        }
    }

    updateTimeControlsAvailability();
}

function updateTimeControlsAvailability() {
    const isTimeEnabled = elements.timeReference.value !== "none";
    elements.hourSelect.disabled = !isTimeEnabled;
    elements.minuteSelect.disabled = !isTimeEnabled;
}

async function persistControlSettings() {
    const nextSettings = {
        ...appState.settings,
        default_transport_mode: elements.transportMode.value,
        default_time_reference: elements.timeReference.value,
        default_hour: elements.hourSelect.value,
        default_minutes: elements.minuteSelect.value,
        max_duration_minutes: elements.maxDurationFilter.value.trim()
    };
    appState.settings = nextSettings;
    await syncSet({ user_settings: nextSettings });
}

function renderSuggestions() {
    elements.suggestions.textContent = "";
    const origins = dedupe([...appState.favoriteOrigins, ...appState.originHistory]);
    for (const origin of origins) {
        const option = document.createElement("option");
        option.value = origin;
        elements.suggestions.appendChild(option);
    }
}

function renderFavoriteOrigins() {
    elements.favoriteList.textContent = "";
    for (const origin of appState.favoriteOrigins) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "favorite-chip";
        chip.dataset.origin = origin;
        chip.textContent = origin;
        elements.favoriteList.appendChild(chip);
    }
}

function dedupe(values) {
    const seen = new Set();
    const result = [];
    for (const value of values) {
        const safeValue = typeof value === "string" ? value : "";
        const normalized = safeValue.trim().toLowerCase();
        if (!normalized || seen.has(normalized)) {
            continue;
        }
        seen.add(normalized);
        result.push(safeValue.trim());
    }
    return result;
}

function updateFavoriteButtonState() {
    const origin = elements.addressInput.value.trim().toLowerCase();
    const isFavorite = appState.favoriteOrigins.some((item) => {
        const safeItem = typeof item === "string" ? item : "";
        return safeItem.trim().toLowerCase() === origin && origin;
    });
    elements.favoriteButton.classList.toggle("active", isFavorite);
    elements.favoriteButton.setAttribute("aria-pressed", String(isFavorite));
}

async function toggleFavoriteOrigin() {
    const origin = elements.addressInput.value.trim();
    if (!origin) {
        showBanner("info", t("favorite_required"));
        return;
    }

    const normalizedOrigin = origin.toLowerCase();
    const alreadyFavorite = appState.favoriteOrigins.some((item) => {
        const safeItem = typeof item === "string" ? item : "";
        return safeItem.trim().toLowerCase() === normalizedOrigin;
    });

    if (alreadyFavorite) {
        appState.favoriteOrigins = appState.favoriteOrigins.filter((item) => {
            const safeItem = typeof item === "string" ? item : "";
            return safeItem.trim().toLowerCase() !== normalizedOrigin;
        });
        showBanner("info", t("favorite_removed"));
    } else {
        appState.favoriteOrigins.unshift(origin);
        appState.favoriteOrigins = dedupe(appState.favoriteOrigins).slice(0, 8);
        showBanner("success", t("favorite_added"));
    }

    await syncSet({ favorite_origins: appState.favoriteOrigins });
    renderFavoriteOrigins();
    renderSuggestions();
    updateFavoriteButtonState();
}

async function handleComputeClick() {
    const origin = elements.addressInput.value.trim();
    if (!origin) {
        showBanner("error", t("origin_required"));
        setStatus("error");
        return;
    }

    const { address_list: addressList } = await syncGet("address_list");
    if (!Array.isArray(addressList) || addressList.length === 0) {
        showBanner("info", t("no_destination_saved"));
        setStatus("error");
        return;
    }

    setLoadingState(true);

    try {
        const timing = buildTimingPayload();
        const transportMode = elements.transportMode.value;

        const results = await runWithConcurrency(addressList, 4, async (addressElement) => {
            const apiResponse = await callAPI({
                origin,
                destination: addressElement.address,
                transport_mode: transportMode,
                time_reference: timing.timeReference,
                time_value: timing.timeValue,
                arrival_time: timing.arrivalTime,
                departure_time: timing.departureTime
            });
            return normalizeDestinationResult(addressElement, apiResponse);
        });

        const successful = results.filter((item) => item.status === "OK").sort(
            (left, right) => left.duration_seconds - right.duration_seconds
        );
        const failed = results.filter((item) => item.status !== "OK");
        const filteredSuccessful = applyDurationFilter(successful);
        const hiddenByFilter = successful.length - filteredSuccessful.length;
        const orderedResults = [...successful, ...failed];

        const distances = {
            origin,
            transport_mode: transportMode,
            destinations: orderedResults,
            computed_at: Date.now()
        };

        appState.distances = distances;
        await syncSet({ distances });
        await storeOriginInHistory(origin);

        renderDistances(distances);

        if (failed.length > 0) {
            showBanner("error", t("partial_errors", { count: failed.length }));
            setStatus("error");
        } else if (hiddenByFilter > 0) {
            showBanner("info", t("filter_applied", { count: hiddenByFilter }));
            setStatus("success");
        } else {
            showBanner("success", t("calculation_done"));
            setStatus("success");
        }
    } catch (error) {
        console.error("Could not compute travel times:", error);
        showBanner("error", error.message || "Request failed.");
        setStatus("error");
    } finally {
        setLoadingState(false);
    }
}

function buildTimingPayload() {
    const timeReference = elements.timeReference.value;
    if (timeReference === "none") {
        return {
            timeReference: "none",
            timeValue: "",
            arrivalTime: "",
            departureTime: ""
        };
    }

    const timestamp = createFutureUnixTimestamp(elements.hourSelect.value, elements.minuteSelect.value);

    if (timeReference === "arrival") {
        return {
            timeReference,
            timeValue: timestamp,
            arrivalTime: timestamp,
            departureTime: ""
        };
    }

    return {
        timeReference: "departure",
        timeValue: timestamp,
        arrivalTime: "",
        departureTime: timestamp
    };
}

function createFutureUnixTimestamp(hourText, minuteText) {
    const now = new Date();
    const target = new Date(now);
    target.setHours(Number(hourText), Number(minuteText), 0, 0);
    if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
    }
    return String(Math.floor(target.getTime() / 1000));
}

async function storeOriginInHistory(origin) {
    const nextHistory = dedupe([origin, ...appState.originHistory]).slice(0, 12);
    appState.originHistory = nextHistory;
    await syncSet({ origin_history: nextHistory });
    renderSuggestions();
}

function applyDurationFilter(destinations) {
    const rawLimit = elements.maxDurationFilter.value.trim();
    if (!rawLimit) {
        return destinations;
    }
    const maxMinutes = Number(rawLimit);
    if (!Number.isFinite(maxMinutes) || maxMinutes <= 0) {
        return destinations;
    }
    const maxSeconds = maxMinutes * 60;
    return destinations.filter((item) => {
        if (item.status !== "OK") {
            return true;
        }
        return item.duration_seconds <= maxSeconds;
    });
}

function normalizeDestinationResult(addressElement, apiResponse) {
    if (apiResponse && apiResponse.status === "OK") {
        const duration = extractDuration(apiResponse);
        return {
            id: addressElement.id,
            name: addressElement.name,
            address: addressElement.address,
            status: "OK",
            cached: Boolean(apiResponse.cached),
            travel_time: duration.text || t("unknown_duration"),
            duration_seconds: duration.value,
            api_source: apiResponse.api_source || "GOOGLE"
        };
    }

    return {
        id: addressElement.id,
        name: addressElement.name,
        address: addressElement.address,
        status: apiResponse && apiResponse.status ? apiResponse.status : "REQUEST_FAILED",
        cached: false,
        travel_time: t("error_duration"),
        duration_seconds: Number.MAX_SAFE_INTEGER,
        error_message: apiResponse && apiResponse.error_message ? apiResponse.error_message : ""
    };
}

function extractDuration(apiResponse) {
    const route = apiResponse.routes && apiResponse.routes[0];
    const leg = route && route.legs && route.legs[0];

    if (!leg || !leg.duration) {
        return {
            text: t("unknown_duration"),
            value: Number.MAX_SAFE_INTEGER
        };
    }

    const durationText = typeof leg.duration.text === "string" ? leg.duration.text : "";
    const rawValue = Number(leg.duration.value);
    const durationValue = Number.isFinite(rawValue) && rawValue >= 0
        ? rawValue
        : parseDurationTextToSeconds(durationText);

    return {
        text: durationText || formatDuration(durationValue),
        value: durationValue
    };
}

function parseDurationTextToSeconds(durationText) {
    if (!durationText || typeof durationText !== "string") {
        return Number.MAX_SAFE_INTEGER;
    }

    const lower = durationText.toLowerCase();
    const hoursMatch = lower.match(/(\d+)\s*(h|hr|hour|hours)/);
    const minutesMatch = lower.match(/(\d+)\s*(m|min|minute|minutes)/);

    const hours = hoursMatch ? Number(hoursMatch[1]) : 0;
    const minutes = minutesMatch ? Number(minutesMatch[1]) : 0;

    if (!hours && !minutes) {
        const onlyNumber = lower.match(/(\d+)/);
        return onlyNumber ? Number(onlyNumber[1]) * 60 : Number.MAX_SAFE_INTEGER;
    }

    return hours * 3600 + minutes * 60;
}

function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0 || seconds === Number.MAX_SAFE_INTEGER) {
        return t("unknown_duration");
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    if (hours > 0 && minutes > 0) {
        return `${hours} h ${minutes} min`;
    }
    if (hours > 0) {
        return `${hours} h`;
    }
    return `${minutes} min`;
}

async function callAPI(message) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(
            {
                name: "distance",
                ...message
            },
            (response) => {
                if (chrome.runtime.lastError) {
                    resolve({
                        status: "REQUEST_FAILED",
                        error_message: chrome.runtime.lastError.message
                    });
                    return;
                }
                resolve(response || { status: "REQUEST_FAILED", error_message: "No response." });
            }
        );
    });
}

async function runWithConcurrency(items, concurrency, job) {
    const output = new Array(items.length);
    let cursor = 0;

    async function worker() {
        while (true) {
            const index = cursor;
            cursor += 1;
            if (index >= items.length) {
                return;
            }
            output[index] = await job(items[index], index);
        }
    }

    const workerCount = Math.max(1, Math.min(concurrency, items.length));
    const workers = [];
    for (let i = 0; i < workerCount; i += 1) {
        workers.push(worker());
    }
    await Promise.all(workers);
    return output;
}

function renderDistances(distances) {
    if (!distances || !distances.origin || !Array.isArray(distances.destinations)) {
        elements.resultsContainer.classList.add("is-hidden");
        elements.resultsBody.textContent = "";
        elements.originLine.textContent = "";
        elements.resultsMeta.textContent = "";
        return;
    }

    const transportMode = distances.transport_mode || elements.transportMode.value;
    const allDestinations = Array.isArray(distances.destinations) ? distances.destinations : [];
    const displayedDestinations = applyDurationFilter(allDestinations);

    elements.resultsContainer.classList.remove("is-hidden");
    elements.originLine.textContent = t("origin_summary", { origin: distances.origin });

    const cachedCount = displayedDestinations.filter((item) => item.cached).length;
    elements.resultsMeta.textContent = t("results_summary", {
        shown: displayedDestinations.length,
        total: allDestinations.length,
        cached: cachedCount
    });

    renderDistanceRows(distances.origin, transportMode, displayedDestinations);
}

function renderDistanceRows(origin, transportMode, destinations) {
    elements.resultsBody.textContent = "";

    if (!destinations || destinations.length === 0) {
        elements.emptyState.classList.remove("is-hidden");
        return;
    }

    elements.emptyState.classList.add("is-hidden");

    for (const destination of destinations) {
        const row = document.createElement("tr");

        const destinationCell = document.createElement("td");
        const nameNode = document.createElement("div");
        nameNode.className = "destination-name";
        nameNode.textContent = destination.name;
        const addressNode = document.createElement("div");
        addressNode.className = "destination-address";
        addressNode.textContent = destination.address;
        destinationCell.appendChild(nameNode);
        destinationCell.appendChild(addressNode);

        const durationCell = document.createElement("td");
        durationCell.textContent = destination.travel_time;

        const statusCell = document.createElement("td");
        const statusPill = document.createElement("span");
        statusPill.classList.add("status-pill");
        if (destination.status !== "OK") {
            statusPill.classList.add("error");
            statusPill.textContent = t("status_error");
            statusPill.title = destination.error_message || destination.status;
        } else if (destination.cached) {
            statusPill.classList.add("cached");
            statusPill.textContent = t("status_cached");
        } else {
            statusPill.classList.add("live");
            statusPill.textContent = t("status_live");
        }
        statusCell.appendChild(statusPill);

        const actionCell = document.createElement("td");
        if (destination.status === "OK") {
            const openButton = document.createElement("button");
            openButton.type = "button";
            openButton.className = "table-action-button";
            openButton.dataset.openMaps = "true";
            openButton.dataset.origin = origin;
            openButton.dataset.destination = destination.address;
            openButton.dataset.transportMode = transportMode;
            openButton.textContent = t("open_maps");
            actionCell.appendChild(openButton);
        } else {
            actionCell.textContent = "-";
        }

        row.appendChild(destinationCell);
        row.appendChild(durationCell);
        row.appendChild(statusCell);
        row.appendChild(actionCell);
        elements.resultsBody.appendChild(row);
    }
}

function getMapsURL(origin, destination, transportMode) {
    const url = new URL("https://www.google.com/maps/dir/");
    url.search = new URLSearchParams({
        api: "1",
        origin,
        destination,
        travelmode: transportMode
    }).toString();
    return url.toString();
}

function setLoadingState(isLoading) {
    elements.computeButton.disabled = isLoading;
    elements.setupButton.disabled = isLoading;
    elements.favoriteButton.disabled = isLoading;
    elements.computeButton.textContent = isLoading ? t("compute_loading_button") : t("compute_button");
    if (isLoading) {
        setStatus("loading");
    }
}

function setStatus(status) {
    elements.statusChip.classList.remove("idle", "loading", "success", "error");
    elements.statusChip.classList.add(status);
    if (status === "loading") {
        elements.statusChip.textContent = t("state_loading");
        return;
    }
    if (status === "success") {
        elements.statusChip.textContent = t("state_success");
        return;
    }
    if (status === "error") {
        elements.statusChip.textContent = t("state_error");
        return;
    }
    elements.statusChip.textContent = t("state_idle");
}

function showBanner(type, message, durationMs) {
    if (appState.bannerTimerId) {
        window.clearTimeout(appState.bannerTimerId);
        appState.bannerTimerId = null;
    }

    elements.banner.classList.remove("is-hidden", "info", "success", "error");
    elements.banner.classList.add(type);
    elements.banner.textContent = message;

    const timeout = Number.isFinite(durationMs) ? durationMs : 4200;
    appState.bannerTimerId = window.setTimeout(() => {
        elements.banner.classList.add("is-hidden");
        elements.banner.textContent = "";
    }, timeout);
}

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
