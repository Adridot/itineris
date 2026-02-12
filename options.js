const DEFAULT_SETTINGS = {
    default_transport_mode: "transit",
    default_time_reference: "arrival",
    default_hour: "08",
    default_minutes: "00",
    max_duration_minutes: "",
    cache_ttl_minutes: 10
};

const appState = {
    addresses: [],
    settings: { ...DEFAULT_SETTINGS },
    favoriteOrigins: [],
    editingId: null,
    bannerTimerId: null
};

const elements = {
    banner: document.getElementById("options_banner"),
    count: document.getElementById("destinations_count"),
    addForm: document.getElementById("add_form"),
    nameInput: document.getElementById("name_input"),
    addressInput: document.getElementById("address_input"),
    table: document.getElementById("table"),
    tableBody: document.getElementById("table_body"),
    emptyMessage: document.getElementById("no_address_message"),
    defaultTransport: document.getElementById("default_transport_mode_select"),
    defaultTimeReference: document.getElementById("default_time_reference_select"),
    defaultHour: document.getElementById("default_hour_select"),
    defaultMinutes: document.getElementById("default_minutes_select"),
    maxFilterInput: document.getElementById("max_duration_default_input"),
    cacheTtlInput: document.getElementById("cache_ttl_input"),
    saveSettingsButton: document.getElementById("save_settings_button"),
    resetSettingsButton: document.getElementById("reset_settings_button"),
    clearCacheButton: document.getElementById("clear_cache_button"),
    favoriteList: document.getElementById("favorite_origins_list"),
    noFavoriteMessage: document.getElementById("no_favorite_message"),
    clearFavoritesButton: document.getElementById("clear_favorites_button")
};

document.addEventListener("DOMContentLoaded", () => {
    init().catch((error) => {
        console.error("Options initialization failed:", error);
        showBanner("error", error.message || "Initialization failed.");
    });
});

function t(key, variables) {
    return window.i18n.t(key, variables);
}

async function init() {
    populateTimeSelects();
    bindEvents();

    const data = await syncGet(["address_list", "favorite_origins", "user_settings"]);
    appState.addresses = Array.isArray(data.address_list) ? data.address_list : [];
    appState.favoriteOrigins = Array.isArray(data.favorite_origins) ? data.favorite_origins : [];
    appState.settings = mergeSettings(data.user_settings);

    applyTranslations();
    applySettingsToControls();
    renderAddressTable();
    renderFavoriteOrigins();
}

function bindEvents() {
    elements.addForm.addEventListener("submit", (event) => {
        event.preventDefault();
        void addAddress();
    });

    elements.tableBody.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-action]");
        if (!button) {
            return;
        }
        const action = button.dataset.action;
        const rowId = Number(button.dataset.id);
        if (!rowId) {
            return;
        }

        if (action === "edit") {
            startEditing(rowId);
            return;
        }
        if (action === "cancel") {
            cancelEditing();
            return;
        }
        if (action === "save") {
            void saveEditedRow(rowId);
            return;
        }
        if (action === "delete") {
            void deleteAddress(rowId);
        }
    });

    elements.defaultTransport.addEventListener("change", () => {
        refreshTimeReferenceAvailability();
    });

    elements.saveSettingsButton.addEventListener("click", () => {
        void saveSettings();
    });

    elements.resetSettingsButton.addEventListener("click", () => {
        void resetSettings();
    });

    elements.clearCacheButton.addEventListener("click", () => {
        void clearApiCache();
    });

    elements.favoriteList.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-remove-favorite]");
        if (!button) {
            return;
        }
        const origin = button.dataset.removeFavorite;
        if (!origin) {
            return;
        }
        void removeFavorite(origin);
    });

    elements.clearFavoritesButton.addEventListener("click", () => {
        void clearFavorites();
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
    elements.defaultHour.textContent = "";
    for (let hour = 0; hour < 24; hour += 1) {
        const option = document.createElement("option");
        option.value = String(hour).padStart(2, "0");
        option.textContent = String(hour).padStart(2, "0");
        elements.defaultHour.appendChild(option);
    }

    elements.defaultMinutes.textContent = "";
    for (let minute = 0; minute < 60; minute += 10) {
        const option = document.createElement("option");
        option.value = String(minute).padStart(2, "0");
        option.textContent = String(minute).padStart(2, "0");
        elements.defaultMinutes.appendChild(option);
    }
}

function applySettingsToControls() {
    if (elements.defaultTransport.querySelector(`option[value="${appState.settings.default_transport_mode}"]`)) {
        elements.defaultTransport.value = appState.settings.default_transport_mode;
    }

    if (elements.defaultTimeReference.querySelector(`option[value="${appState.settings.default_time_reference}"]`)) {
        elements.defaultTimeReference.value = appState.settings.default_time_reference;
    }

    if (elements.defaultHour.querySelector(`option[value="${appState.settings.default_hour}"]`)) {
        elements.defaultHour.value = appState.settings.default_hour;
    }

    if (elements.defaultMinutes.querySelector(`option[value="${appState.settings.default_minutes}"]`)) {
        elements.defaultMinutes.value = appState.settings.default_minutes;
    }

    elements.maxFilterInput.value = appState.settings.max_duration_minutes || "";
    elements.cacheTtlInput.value = String(appState.settings.cache_ttl_minutes || DEFAULT_SETTINGS.cache_ttl_minutes);

    refreshTimeReferenceAvailability(true);
}

function refreshTimeReferenceAvailability(silent) {
    const transportMode = elements.defaultTransport.value;
    const arrivalOption = elements.defaultTimeReference.querySelector('option[value="arrival"]');

    if (arrivalOption) {
        arrivalOption.disabled = transportMode !== "transit";
    }

    if (transportMode !== "transit" && elements.defaultTimeReference.value === "arrival") {
        elements.defaultTimeReference.value = "departure";
        if (!silent) {
            showBanner("info", t("arrival_restricted"), 3600);
        }
    }
}

async function addAddress() {
    const name = elements.nameInput.value.trim();
    const address = elements.addressInput.value.trim();

    if (!name || !address) {
        showBanner("error", t("missing_address_fields"));
        return;
    }

    const duplicate = appState.addresses.some((entry) => {
        const safeAddress = entry && typeof entry.address === "string" ? entry.address : "";
        return safeAddress.trim().toLowerCase() === address.toLowerCase();
    });
    if (duplicate) {
        showBanner("info", t("duplicate_address"));
        return;
    }

    const newAddress = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        name,
        address
    };

    appState.addresses.push(newAddress);
    await syncSet({ address_list: appState.addresses });

    elements.nameInput.value = "";
    elements.addressInput.value = "";
    renderAddressTable();
    showBanner("success", t("destination_added"));
}

function renderAddressTable() {
    elements.tableBody.textContent = "";

    if (!appState.addresses.length) {
        elements.table.classList.add("is-hidden");
        elements.emptyMessage.classList.remove("is-hidden");
        elements.count.textContent = "0";
        return;
    }

    elements.table.classList.remove("is-hidden");
    elements.emptyMessage.classList.add("is-hidden");
    elements.count.textContent = String(appState.addresses.length);

    for (const addressElement of appState.addresses) {
        const row = buildAddressRow(addressElement, appState.editingId === addressElement.id);
        elements.tableBody.appendChild(row);
    }
}

function buildAddressRow(addressElement, isEditing) {
    const row = document.createElement("tr");
    row.dataset.id = String(addressElement.id);

    const nameCell = document.createElement("td");
    const nameDisplay = document.createElement("span");
    nameDisplay.textContent = addressElement.name;
    nameDisplay.classList.toggle("is-hidden", isEditing);

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = addressElement.name;
    nameInput.className = "inline-input";
    nameInput.dataset.field = "name";
    nameInput.classList.toggle("is-hidden", !isEditing);

    nameCell.appendChild(nameDisplay);
    nameCell.appendChild(nameInput);

    const addressCell = document.createElement("td");
    const addressDisplay = document.createElement("span");
    addressDisplay.textContent = addressElement.address;
    addressDisplay.classList.toggle("is-hidden", isEditing);

    const addressInput = document.createElement("input");
    addressInput.type = "text";
    addressInput.value = addressElement.address;
    addressInput.className = "inline-input";
    addressInput.dataset.field = "address";
    addressInput.classList.toggle("is-hidden", !isEditing);

    addressCell.appendChild(addressDisplay);
    addressCell.appendChild(addressInput);

    const actionsCell = document.createElement("td");
    const actionsWrap = document.createElement("div");
    actionsWrap.className = "actions-wrap";

    const editSaveButton = document.createElement("button");
    editSaveButton.type = "button";
    editSaveButton.className = "icon-button";
    editSaveButton.dataset.id = String(addressElement.id);
    editSaveButton.dataset.action = isEditing ? "save" : "edit";
    editSaveButton.textContent = isEditing ? t("save_button") : t("edit_button");

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "icon-button cancel";
    cancelButton.dataset.id = String(addressElement.id);
    cancelButton.dataset.action = "cancel";
    cancelButton.textContent = t("cancel_button");
    cancelButton.classList.toggle("is-hidden", !isEditing);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "icon-button delete";
    deleteButton.dataset.id = String(addressElement.id);
    deleteButton.dataset.action = "delete";
    deleteButton.textContent = t("delete_button");

    actionsWrap.appendChild(editSaveButton);
    actionsWrap.appendChild(cancelButton);
    actionsWrap.appendChild(deleteButton);
    actionsCell.appendChild(actionsWrap);

    row.appendChild(nameCell);
    row.appendChild(addressCell);
    row.appendChild(actionsCell);
    return row;
}

function startEditing(rowId) {
    appState.editingId = rowId;
    renderAddressTable();
}

function cancelEditing() {
    appState.editingId = null;
    renderAddressTable();
}

async function saveEditedRow(rowId) {
    const row = elements.tableBody.querySelector(`tr[data-id="${rowId}"]`);
    if (!row) {
        return;
    }

    const nameInput = row.querySelector('input[data-field="name"]');
    const addressInput = row.querySelector('input[data-field="address"]');

    const name = nameInput ? nameInput.value.trim() : "";
    const address = addressInput ? addressInput.value.trim() : "";

    if (!name || !address) {
        showBanner("error", t("missing_address_fields"));
        return;
    }

    appState.addresses = appState.addresses.map((entry) => {
        if (entry.id === rowId) {
            return { ...entry, name, address };
        }
        return entry;
    });

    appState.editingId = null;
    await syncSet({ address_list: appState.addresses });
    renderAddressTable();
    showBanner("success", t("destination_updated"));
}

async function deleteAddress(rowId) {
    appState.addresses = appState.addresses.filter((entry) => entry.id !== rowId);
    if (appState.editingId === rowId) {
        appState.editingId = null;
    }
    await syncSet({ address_list: appState.addresses });
    renderAddressTable();
    showBanner("info", t("destination_deleted"));
}

async function saveSettings() {
    const cacheTtl = Number(elements.cacheTtlInput.value.trim() || DEFAULT_SETTINGS.cache_ttl_minutes);
    if (!Number.isFinite(cacheTtl) || cacheTtl < 1 || cacheTtl > 120) {
        showBanner("error", t("invalid_cache_ttl"));
        return;
    }

    const nextSettings = {
        ...DEFAULT_SETTINGS,
        default_transport_mode: elements.defaultTransport.value,
        default_time_reference: elements.defaultTimeReference.value,
        default_hour: elements.defaultHour.value,
        default_minutes: elements.defaultMinutes.value,
        max_duration_minutes: elements.maxFilterInput.value.trim(),
        cache_ttl_minutes: Math.round(cacheTtl)
    };

    if (nextSettings.default_transport_mode !== "transit" && nextSettings.default_time_reference === "arrival") {
        nextSettings.default_time_reference = "departure";
    }

    appState.settings = nextSettings;

    await syncSet({ user_settings: nextSettings });
    applyTranslations();
    applySettingsToControls();
    renderAddressTable();
    renderFavoriteOrigins();
    showBanner("success", t("preferences_saved"));
}

async function resetSettings() {
    appState.settings = { ...DEFAULT_SETTINGS };
    await syncSet({ user_settings: appState.settings });
    applySettingsToControls();
    showBanner("info", t("preferences_reset"));
}

async function clearApiCache() {
    const response = await sendRuntimeMessage({ name: "clear_cache" });
    if (response && response.status === "OK") {
        showBanner("success", t("cache_cleared"));
        return;
    }
    showBanner("error", t("cache_clear_failed"));
}

function renderFavoriteOrigins() {
    elements.favoriteList.textContent = "";

    if (!appState.favoriteOrigins.length) {
        elements.noFavoriteMessage.classList.remove("is-hidden");
        elements.clearFavoritesButton.classList.add("is-hidden");
        return;
    }

    elements.noFavoriteMessage.classList.add("is-hidden");
    elements.clearFavoritesButton.classList.remove("is-hidden");

    for (const origin of appState.favoriteOrigins) {
        const chip = document.createElement("span");
        chip.className = "favorite-chip";
        chip.textContent = origin;

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.dataset.removeFavorite = origin;
        removeButton.textContent = "x";

        chip.appendChild(removeButton);
        elements.favoriteList.appendChild(chip);
    }
}

async function removeFavorite(origin) {
    appState.favoriteOrigins = appState.favoriteOrigins.filter((entry) => entry !== origin);
    await syncSet({ favorite_origins: appState.favoriteOrigins });
    renderFavoriteOrigins();
}

async function clearFavorites() {
    appState.favoriteOrigins = [];
    await syncSet({ favorite_origins: [] });
    renderFavoriteOrigins();
    showBanner("info", t("favorites_cleared"));
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

async function sendRuntimeMessage(message) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                resolve({ status: "REQUEST_FAILED", error_message: chrome.runtime.lastError.message });
                return;
            }
            resolve(response || { status: "REQUEST_FAILED" });
        });
    });
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
