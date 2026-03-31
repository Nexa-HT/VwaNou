# Extraction Frontend VwaNou

Ce dossier contient les composants extraits du projet VwaNou pour l'animation de démarrage et la carte interactive.

## Installation des Dépendances

Pour utiliser ces composants, vous devez installer les bibliothèques suivantes dans votre projet :

```bash
npm install maplibre-gl react-map-gl @types/geojson
```

## Structure des Fichiers

```text
extracted_frontend/
├── components/
│   ├── SplashScreen.tsx  <-- Animation du début
│   ├── SplashScreen.css
│   ├── MapView.tsx       <-- Composant principal de la carte
│   ├── MapPage.tsx       <-- Exemple de page assemblée (Page par défaut)
│   ├── Sidebar.tsx       <-- Barre latérale (filtres et stats)
│   ├── FloatingActions.tsx <-- Boutons 2D/3D et Signalement
│   ├── AlertBanner.tsx    <-- Bandeau d'alertes en haut
│   ├── IncidentMarker.tsx <-- Marqueurs d'incidents
│   ├── UserLocationMarker.tsx <-- Marqueur position utilisateur
│   └── ZonePolygon.tsx    <-- Polygones de zones à risque
├── types/
│   ├── Incident.ts
│   └── Zone.ts
├── styles/
│   └── theme.css         <-- Variables CSS globales et utilitaires
└── public/
    ├── icons.svg
    └── icons/
        ├── incident.svg
        └── user-dot.svg
```

## Intégration

### 1. Variables CSS
Importez `styles/theme.css` dans votre fichier principal (ex: `main.tsx` ou `App.tsx`) pour que les couleurs et le flou (glassmorphism) fonctionnent correctement.

```tsx
import './extracted_frontend/styles/theme.css';
```

### 2. Assets (Icônes)
Copiez le contenu du dossier `extracted_frontend/public/` dans le dossier `public/` de votre projet de destination.

### 3. Utilisation des Composants

#### Splash Screen (Animation)
Ajoutez le composant `SplashScreen` au sommet de votre application. Il s'auto-détruira après 3 secondes.

```tsx
import SplashScreen from './components/SplashScreen';

function App() {
  return (
    <>
      <SplashScreen />
      {/* Reste de votre app */}
    </>
  );
}
```

#### Carte Interactive
Utilisez `MapPage.tsx` comme référence. Par défaut, la carte est configurée en mode plat (2D). Vous pouvez basculer en 3D via l'état `is3DMode`.

> [!TIP]
> Dans `MapView.tsx`, vous pouvez changer la constante `MAP_STYLE` pour utiliser votre propre style de carte si nécessaire.

## Notes sur React Router
Le composant `FloatingActions.tsx` utilise `<Link>` de `react-router-dom`. Si votre projet n'utilise pas de routeur, remplacez-le par une balise `<a>` ou un bouton.
