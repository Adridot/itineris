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

## 9) Prompts IA pour images promotionnelles

Objectif Google:

- Petite image promotionnelle: `440 x 280`
- Image promotionnelle en haut de page: `1400 x 560`
- Format final: `JPEG` ou `PNG 24 bits` sans alpha

Conseil:

- Generer d'abord une image plus grande (x2 ou x3), puis exporter au format final exact.
- Eviter les micro-textes et eviter tout logo de marque tierce.

### Prompt A - Petite image promotionnelle (440x280)

`Create a clean, modern Chrome extension promo visual for a commute comparison app named "Itineris". Show a laptop-style UI mockup with a travel-time comparison table, destination chips, and a highlighted "Compute travel times" button. Use a bright premium palette: soft cream background, light sky accents, teal primary action, subtle yellow highlights. Add abstract rounded geometric shapes in the background for depth. The composition must remain readable at small size, with strong contrast, no clutter, and one clear focal area. Style: product marketing hero, minimal, high-end SaaS aesthetic, soft shadows, crisp typography, realistic but stylized UI card. Aspect ratio 11:7.`

Negative prompt:

`No watermarks, no logos from other brands, no tiny unreadable text, no dark moody scene, no purple-dominant palette, no noisy textures, no alpha background, no photoreal people.`

### Prompt B - Hero image haut de page (1400x560)

`Design a wide promotional banner for a Chrome extension called "Itineris", focused on comparing commute times from one origin to multiple destinations. Layout: left side shows a clean headline area and 3 short feature bullets (multi-destination comparison, favorites/history, smart cache), right side shows a polished UI mockup with route duration rows and status tags (Live / Cached). Visual direction: modern, trustworthy, productivity-focused. Colors: off-white base, light cyan gradients, deep teal CTA accents, warm amber micro-highlights. Include subtle depth with layered translucent cards and smooth radial gradients. Ensure excellent readability, generous spacing, and balanced negative space. Aspect ratio 2.5:1, optimized for 1400x560 export.`

Negative prompt:

`No crowded layout, no long paragraph text, no illegible fonts, no random icons unrelated to maps/travel, no harsh neon colors, no alpha transparency, no compressed artifacts.`

### Prompt C - Variante sans texte (si tu preferes ajouter le texte ensuite)

`Create a text-free marketing visual for a travel-time comparison browser extension. Show elegant UI cards with destination list, duration badges, and map-pin inspired iconography. Bright, clean, premium product look. Palette: ivory, pale blue, teal, warm yellow accents. Keep strong composition and visual hierarchy without any written text. Provide a high-resolution master suitable for 440x280 and 1400x560 crops.`

Negative prompt:

`No words, no letters, no watermark, no alpha channel, no blur-heavy details, no dark background.`

### Parametres recommandes pour generation

- Model type: image generation model tuned for UI/product marketing.
- Guidance/creativity: medium (eviter rendu trop fantaisiste).
- Sampling: standard/high quality.
- Output master size suggeree:
  - pour 440x280: generer en `1760x1120`, puis downscale.
  - pour 1400x560: generer en `2800x1120`, puis downscale.
- Export final:
  - PNG 24 bits (RGB, sans alpha), ou
  - JPEG qualite elevee (90+), profil sRGB.
