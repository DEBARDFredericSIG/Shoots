# Eclipse Cam

App mobile (Expo/React Native) pour automatiser les séquences de photos lors d'une éclipse solaire totale, avec mode d'entraînement sur la lune de nuit.

## Run & Operate

- `pnpm --filter @workspace/eclipse-cam run dev` — Expo dev server (mobile)
- `pnpm --filter @workspace/api-server run dev` — API server (port 5000)
- `pnpm run typecheck` — vérification TypeScript complète

## Stack

- Expo SDK 54, React Native 0.81, Expo Router v6
- AsyncStorage pour la persistance locale
- react-native-svg + react-native-reanimated pour animations (countdown ring)
- expo-haptics pour le feedback haptique au déclenchement
- Thème dark space permanent (noir profond + orange corona + bleu lune)

## Fonctionnalités

### Contrôleur de séquences
- **Déclenchement automatique** : compte à rebours animé, flash visuel + haptic au déclenchement
- **Simulation** : vitesse ×1 / ×60 / ×300 pour s'entraîner rapidement
- **Modes** : Éclipse solaire / Lune (bascule instantanée)

### Séquences prédéfinies
- **Éclipse Totale** : 15 étapes du C1 au C4 (phases partielles, perles de Baily, anneau de diamant, totalité, couronne, protubérances, lumière cendrée)
- **Entraînement Lunaire** : 9 étapes (référence, terminateur, hautes ISO, bracketing, hyperfocale)

### Mise au point verrouillée (par étape)
- `∞ Infini` — étoiles, soleil, pleine lune
- `∞− Quasi-infini` — optimisé corona / protubérances
- `⊕ Hyperfocale` — profondeur de champ maximale (poses longues)

### Éditeur de séquences
- Création/duplication/modification de séquences personnalisées
- Paramètres par étape : ISO, vitesse, ouverture, nombre de photos, intervalle, mise au point, notes
- Réorganisation des étapes (haut/bas)

### Historique
- Journal de toutes les sessions (étapes complétées, photos déclenchées, durée)
- Log détaillé de chaque photo (paramètres + mode de mise au point utilisé)

## Where things live

- `artifacts/eclipse-cam/` — app Expo
- `artifacts/eclipse-cam/context/AppContext.tsx` — état global, séquences par défaut
- `artifacts/eclipse-cam/components/CountdownRing.tsx` — anneau SVG animé Reanimated
- `artifacts/eclipse-cam/app/(tabs)/index.tsx` — écran principal Contrôleur
- `artifacts/eclipse-cam/constants/colors.ts` — palette dark space

## User preferences

- Interface en français
- Thème toujours sombre (astronomie)
- Pas de backend/base de données — tout en AsyncStorage

## Gotchas

- Le RAW natif (DNG) nécessite Camera2 API — pas supporté en Expo Go. L'app est un contrôleur de séquences : elle guide le photographe avec les réglages et déclenche un signal visuel/haptique.
- Scaner le QR code dans Expo Go (Android/iOS) pour tester sur appareil physique.
