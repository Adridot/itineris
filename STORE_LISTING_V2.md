# Itineris V2 - Store Listing Pack

Ce fichier contient du texte pret a coller dans la fiche de publication Chrome Web Store.

## 1) Nom

- `Itineris - Comparateur de trajets`

## 2) Description courte (max 132 caracteres)

### FR (option recommandee)

- `Compare instantanement les temps de trajet vers toutes tes destinations favorites depuis une seule adresse.`

### EN (option)

- `Instantly compare commute times to all your saved destinations from a single origin address.`

## 3) Description detaillee (FR)

`Itineris t'aide a comparer les temps de trajet entre une adresse de depart et plusieurs destinations, en un seul calcul.

Ideal pour choisir un logement, organiser ses deplacements ou comparer plusieurs points d'arrivee rapidement.

Fonctionnalites principales:
- Calcul multi-destinations en une action
- Modes de transport: transports en commun, voiture, marche, velo
- Reference horaire: sans horaire, heure de depart ou heure d'arrivee
- Tri et affichage clairs des resultats
- Filtre optionnel de duree max
- Origines favorites et historique de saisie
- Ouverture directe dans Google Maps
- Cache local configurable pour accelerer les recalculs
- Interface modernisee (popup + page options)
- Support multilingue (FR/EN)

Confidentialite:
- L'extension stocke uniquement tes donnees fonctionnelles (destinations, preferences, cache) dans le stockage Chrome.
- Aucune cle API Google n'est exposee cote extension.
- Les requetes passent par un backend securise (AWS Lambda) avec controle d'origine.`

## 4) Detailed description (EN)

`Itineris helps you compare travel times from one origin address to multiple destinations in a single run.

Perfect for housing decisions, commute planning, and recurring trip comparisons.

Key features:
- One-click multi-destination travel time calculation
- Transport modes: transit, driving, walking, bicycling
- Time reference: no time, departure time, or arrival time
- Clear sorted results table
- Optional max-duration filter
- Favorite origins and input history
- One-click open in Google Maps
- Configurable local cache for faster repeated queries
- Fully refreshed popup and settings pages
- Built-in localization (FR/EN)

Privacy:
- The extension stores only functional data (destinations, preferences, cache) in Chrome storage.
- Google API keys are not exposed in the extension code.
- Requests are sent through a secured AWS Lambda backend with origin checks.`

## 5) Nouveautes pour "What's new in this version"

- `Complete V2 redesign of popup and settings pages`
- `Added favorites, history suggestions, and duration filter`
- `Added localization infrastructure (French and English)`
- `Improved backend reliability with Google Routes API + fallback`
- `Reworked API cache behavior for consistent multi-destination results`
- `Improved popup/options layout and scrolling behavior`

## 6) Mots-cles (SEO Store)

- `commute`
- `travel time`
- `google maps`
- `itineraire`
- `temps de trajet`
- `housing`
- `productivity`
- `transport`

## 7) Permissions justification (a renseigner dans la fiche)

- `storage`: necessaire pour sauvegarder destinations, preferences utilisateur et cache local.
- `host_permissions` (endpoint API): necessaire pour contacter le backend de calcul des trajets.

## 8) Checklist publication V2

1. Verifier la version dans `manifest.json` (`2.0.0` ou superieure).
2. Recharger l'extension et tester:
   - popup (calcul, favoris, filtre),
   - options (CRUD destinations, preferences),
   - cache (2e calcul marque en "cached").
3. Verifier les textes FR/EN dans `_locales/*/messages.json`.
4. Mettre a jour captures d'ecran Store (popup + options).
5. Publier depuis la branche mergee sur `master`.
