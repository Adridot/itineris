# Itineris V2

Extension Chrome pour comparer rapidement les temps de trajet entre une origine et plusieurs destinations en une seule action.

Chrome Web Store (version publiee actuelle):  
`https://chrome.google.com/webstore/detail/pffdkfppfngeiijdkcipdmpmabfkiapk`

## Objectif

Itineris sert a repondre a une question simple:  
"Depuis une adresse donnee, combien de temps me faut-il pour rejoindre mes lieux frequents ?"

Cas typique: recherche de logement, comparaison domicile-travail, optimisation de deplacements recurrents.

## Nouveautes V2

- Refonte complete du popup (UI plus lisible, etats explicites, meilleure ergonomie).
- Refonte complete de la page options.
- Edition inline des destinations dans les options.
- Origines favorites et suggestions d'historique.
- Filtre optionnel de duree max.
- Gestion des references horaires: sans horaire, depart, arrivee.
- Internationalisation native Chrome (`_locales/en`, `_locales/fr`).
- Cache API local avec TTL configurable.
- Backend Lambda modernise:
  - Google Routes API prioritaire.
  - Fallback Google Directions API legacy.
  - Validation d'entree et CORS durci pour extension Chrome.

## Architecture

- `popup.html` / `popup.js` / `popup.css`  
  UI principale de calcul de trajets.
- `options.html` / `options.js` / `options.css`  
  Gestion des destinations et des preferences.
- `background.js`  
  Service worker MV3, appels API, cache, bridge popup <-> backend.
- `lambda_function.py`  
  Backend AWS Lambda qui appelle Google Routes / Directions.
- `i18n.js` + `_locales/*/messages.json`  
  Couche de traduction centralisee.

## Installation locale (dev)

1. Cloner le repo.
2. Ouvrir `chrome://extensions`.
3. Activer le mode developpeur.
4. Cliquer "Charger l'extension non empaquetee".
5. Selectionner le dossier du repo.

## Configuration backend (AWS + Google)

### Prerequis Google Cloud

- Activer `Routes API` (recommande).
- Optionnel: activer `Directions API` pour fallback legacy.
- Creer une cle API restreinte par service.

### Variables d'environnement Lambda

- `GOOGLE_API_PREFERRED=routes`  
  Valeurs possibles: `routes` ou `directions`.
- `ENABLE_DIRECTIONS_FALLBACK=true`  
  Fallback vers Directions si Routes renvoie certaines erreurs.
- `GOOGLE_ROUTES_API_KEY=...`
- `GOOGLE_DIRECTIONS_API_KEY=...`
- `AUTHORIZED_ORIGINS=chrome-extension://<EXTENSION_ID>`
- `AUTHORIZED_EXTENSION_IDS=<EXTENSION_ID>`

Option de dev temporaire:

- `AUTHORIZED_ORIGINS=*` (a eviter en production).

### API Gateway (CORS)

Configurer la route API:

- Methodes: `OPTIONS, POST`
- Headers autorises:  
  `Content-Type, X-Amz-Date, X-Amz-Security-Token, Authorization, X-Api-Key, X-Requested-With, Accept, Origin, X-Extension-Id`
- Origin autorisee: `chrome-extension://<EXTENSION_ID>`  
  (ou plusieurs origines via la variable Lambda `AUTHORIZED_ORIGINS`)

## Contrat API (extension -> Lambda)

Payload POST minimal:

```json
{
  "origin": "10 Downing St, London",
  "destination": "King's Cross Station, London",
  "transport_mode": "transit",
  "time_reference": "arrival",
  "time_value": "1739361600"
}
```

`transport_mode` accepte: `driving`, `walking`, `bicycling`, `transit`.

## Stockage et cache

- `chrome.storage.sync`:
  - `address_list`
  - `distances`
  - `origin_history`
  - `favorite_origins`
  - `user_settings`
- `chrome.storage.local`:
  - entrees cache API (`api_cache_entry::...`)

Le cache:

- est scope par requete (origine, destination, mode, horaire),
- respecte un TTL configurable (`cache_ttl_minutes`),
- est purge automatiquement (TTL + nombre max d'entrees).

## Internationalisation

- Fichiers:
  - `_locales/en/messages.json`
  - `_locales/fr/messages.json`
- `manifest.json` utilise:
  - `"default_locale": "en"`
  - champs `name/description/title` via `__MSG_*__`
- UI: attributs `data-i18n*` + helper `i18n.js`.

## Qualite / verification

Checks utiles:

- `node --check popup.js`
- `node --check options.js`
- `node --check background.js`
- `python3 -m py_compile lambda_function.py`

## Publication V2

Le contenu de publication Store (description courte, longue, changelog, notes permissions) est fourni dans:

- `STORE_LISTING_V2.md`

## Notes de securite

- Le backend refuse les origines non autorisees.
- L'extension envoie `X-Extension-Id` a chaque requete.
- Aucune cle Google n'est exposee dans l'extension (tout passe par Lambda).
