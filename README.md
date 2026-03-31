# VwaNou - Plateforme de Sécurité Communautaire

VwaNou est une application Web moderne de cartographie interactive conçue pour centraliser le signalement, la visualisation, et l'alerte des incidents de sécurité au sein d'une communauté. Cette plateforme connecte directement les citoyens, les entités vérifiées (ONG, Journalistes, Police), et les administrateurs pour créer un environnement d'entraide géographique en temps réel.

## Fonctionnalités Principales

1. **Cartographie en Temps Réel** : Une vue cartographique interactive (Leaflet) permettant l'exploration spatiale des incidents.
2. **Signalement Géolocalisé** : Les utilisateurs peuvent rapporter des incidents via un suivi GPS (filature silencieuse) qui garantit la précision des coordonnées à la seconde près.
3. **Widgets d'Alerte Intelligents** : Bandeau dynamique qualifiant l'urgence des situations (KRITIK, SISPÈK, ENFO) et barre latérale de monitoring "Glassmorphism" affichant les statistiques en direct.
4. **Zonage de Danger (ZonePolygon)** : Tracés de polygones de sécurité depuis le tableau de bord Admin pour délimiter physiquement les zones à risque.
5. **Vérification d'Identité & Modération** : Système complet de validation communautaire des incidents et de demande de rôles "SuperUse" (Policiers, Fonctionnaires certifiés).

## Architecture & Technologies

Le système est entièrement découplé (Frontend / Backend) :

### Frontend (Interface Client)
- **Framework** : React 19 avec Vite.js et configuration TypeScript stricte.
- **UI Design** : Thème Premium *Glassmorphism* personnalisé (UI flottante sans bordures massives).
- **Cartographie** : `react-leaflet`, offrant les contrôles de caméras, marqueurs d'incidents interactifs, et la géolocalisation native des utilisateurs.

### Backend (Serveur)
- **API** : FastAPI complet offrant rapidité d'exécution et documentation asynchrone (Python).
- **Base de données** : PostgreSQL avec ORM SQLAlchemy.
- **Sécurité** : Authentification JWT, et modèle de permission robuste incluant des accréditations modulaires (citoyen, admin, superuser).

## 📦 Installation & Déploiement Local

Pour faire tourner le projet VwaNou en environnement de développement : 

### 1. Backend (Lancer l'API FastAPI et PostgreSQL)
1. Activez votre environnement virtuel Python :
   `./backend/.venv_backend/Scripts/activate`
2. Installez les paquets (si nécessaire) via le `requirements.txt` / pip.
3. Configurez votre `.env` local pour attacher le PostGre (Ex: `DATABASE_URL=postgresql+psycopg2://postgres:VotreMdp@127.0.0.1:5432/vwanou`).
4. Lancez le serveur avec uvicorn :
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

### 2. Frontend (Lancer l'interface Web Vite)
1. Installez les packages via `npm install`
2. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```
3. L'application est alors accessible sous `http://localhost:5173`.
