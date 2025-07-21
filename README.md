Interactive 3D Hexagonal Map Portfolio - README
Overview
This project is an interactive 3D portfolio website that uses Three.js to create an immersive hexagonal map experience. Each hexagon represents a different section of the portfolio, allowing visitors to navigate through my professional universe in an intuitive and engaging way.

# Portfolio Interactif 3D - Thomas Menu

Un portfolio interactif en 3D utilisant Three.js, présentant mes compétences et projets de manière immersive.

## 🚀 Aperçu

Portfolio 3D hexagonal avec :
- **Navigation 3D immersive** - Explorez différentes zones thématiques
- **Animations fluides** - Transitions et effets visuels soignés
- **Support mobile complet** - Contrôles tactiles optimisés
- **Système de progression** - Découvrez compétences et achievements
- **SEO optimisé** - Métadonnées et partage social
- **Performance monitoring** - Optimisé pour tous les appareils

## 🛠️ Technologies

- **Three.js** - Rendu 3D et animations
- **GSAP** - Animations avancées
- **Vanilla JavaScript ES6+** - Code moderne et performant
- **CSS3** - Styles responsives
- **WebGL** - Accélération graphique
- **PWA** - Support Progressive Web App

## 📋 Fonctionnalités

### ✅ Implémentées
- **Gestion d'erreurs robuste** - Fallbacks et notifications utilisateur
- **Support mobile tactile** - Navigation orbite et interactions optimisées
- **SEO et métadonnées** - OpenGraph, Schema.org, PWA manifest
- **Analytics privacy-first** - Suivi des interactions respectueux
- **Système de sauvegarde** - États et progression persistés
- **Tests automatisés** - Suite de tests fonctionnels
- **Sécurité renforcée** - Headers de sécurité configurés
- **Optimisations performance** - Monitoring FPS et mémoire

### 🔄 En cours
- **Finalisation code** - Complétion des fonctions tronquées
- **Tests cross-browser** - Validation tous navigateurs/appareils
- **Optimisations assets** - Compression et lazy loading
- **Accessibilité** - Navigation clavier et ARIA

## 📁 Structure du Projet

```
portfolio/
├── main.js                 # Code principal Three.js
├── portfolio.html          # Page principale
├── index.html             # Page d'accueil
├── 404.html               # Page erreur personnalisée
├── manifest.json          # PWA manifest
├── .htaccess             # Configuration serveur
├── deploy.sh/.ps1        # Scripts déploiement
├── js/
│   ├── seo-manager.js    # Gestion SEO
│   ├── analytics.js      # Analytics
│   ├── state-manager.js  # Sauvegarde états
│   └── portfolio-tester.js # Tests automatisés
├── public/
│   ├── models/           # Modèles 3D (.glb)
│   ├── textures/         # Textures et environnements
│   └── assets/           # Images et icônes
├── sidepages/            # Pages modales
│   ├── contact.html
│   ├── projects.html
│   └── ...
└── styles/               # Feuilles de style
```

## 🚀 Installation & Développement

### Prérequis
- Serveur web (Apache, Nginx, ou serveur local)
- Navigateur moderne avec support WebGL
- Connexion internet (pour les imports ES6)

### Développement Local

1. **Cloner le projet**
   ```bash
   git clone [repository-url]
   cd portfolio
   ```

2. **Serveur local simple**
   ```bash
   # Python
   python -m http.server 8000
   
   # Node.js
   npx serve .
   
   # PHP
   php -S localhost:8000
   ```

3. **Accéder au portfolio**
   ```
   http://localhost:8000/portfolio.html
   ```

### Mode Développement
- Tests automatiques activés
- Console logs détaillés
- Validation assets automatique
- Debugging aids activés

## 📦 Déploiement Production

### Automatique (Recommandé)

**Linux/Mac:**
```bash
chmod +x deploy.sh
./deploy.sh
```

**Windows:**
```powershell
.\deploy.ps1
```

### Manuel

1. **Copier les fichiers**
   ```bash
   # Fichiers essentiels
   cp *.html *.js *.css *.json .htaccess dist/
   cp -r public js sidepages styles dist/
   ```

2. **Optimiser pour la production**
   - Activer `isProduction = true` dans main.js
   - Supprimer portfolio-tester.js et fichiers de dev
   - Configurer les headers de sécurité
   - Compresser les assets si possible

3. **Upload sur le serveur**
   - HTTPS obligatoire pour PWA
   - Configurer les redirections
   - Tester les performances

## 🧪 Tests & Validation

### Tests Automatiques
```javascript
// Dans la console navigateur
const tester = new PortfolioTester();
await tester.runAllTests();
```

### Validation Manuelle
- [ ] Tous les hex cliquables
- [ ] Modales s'ouvrent/ferment
- [ ] Animations fluides
- [ ] Support mobile
- [ ] Performance >30 FPS
- [ ] Assets se chargent
- [ ] Erreurs gérées gracieusement

### Cross-Browser Testing
- **Chrome** (recommandé)
- **Firefox** 
- **Safari**
- **Edge**
- **Mobile browsers**

## 📊 Performance

### Optimisations Appliquées
- **Lazy loading** assets non-critiques
- **LOD system** pour les modèles 3D
- **Texture compression**
- **Asset bundling**
- **Cache optimisé**
- **Gzip compression**

### Métriques Cibles
- **FPS**: >30 sur mobile, >60 sur desktop
- **Temps de chargement**: <3s sur 3G
- **Mémoire**: <200MB
- **Lighthouse**: >90 Performance

## 📱 Support Mobile

### Contrôles Tactiles
- **Glisser** - Navigation orbite caméra
- **Taper** - Sélection objets/zones
- **Pincer** - Zoom (à implémenter)

### Optimisations Mobile
- Interface adaptée écrans tactiles
- Feedback visuel optimisé
- Performance ajustée selon capacités
- Gestes intuitifs

## 🔒 Sécurité

### Headers Configurés
- **CSP** - Content Security Policy
- **HSTS** - HTTP Strict Transport Security
- **X-Frame-Options** - Protection clickjacking
- **X-Content-Type-Options** - MIME sniffing
- **Referrer-Policy** - Contrôle referrer

### Bonnes Pratiques
- Validation côté client/serveur
- Sanitisation des inputs
- Protection contre XSS
- Assets servis via HTTPS

## 🎨 Personnalisation

### Themes
```javascript
// Modifier les couleurs dans CONFIG
const CONFIG = {
  COLORS: {
    PRIMARY: 0x4a9eff,
    SECONDARY: 0x9c27b0,
    // ...
  }
};
```

### Contenu
- Modifier les fichiers HTML dans `/sidepages/`
- Remplacer les modèles 3D dans `/public/models/`
- Adapter les textures dans `/public/textures/`

## 📈 Analytics & SEO

### Métriques Suivies
- Interactions utilisateur
- Temps de visite par zone
- Performance technique
- Erreurs et warnings
- Achievements débloqués

### SEO Optimisé
- Métadonnées dynamiques
- OpenGraph tags
- Schema.org structured data
- Sitemap automatique
- URLs descriptives

## 🐛 Dépannage

### Problèmes Courants

**Portfolio ne se charge pas**
- Vérifier la console pour erreurs WebGL
- S'assurer que les assets sont accessibles
- Tester sur autre navigateur

**Performance lente**
- Réduire la qualité graphique
- Vérifier la mémoire disponible
- Tester sans autres onglets ouverts

**Assets manquants**
- Exécuter la validation assets
- Vérifier les chemins relatifs
- S'assurer du serveur web configuré

**Mobile ne fonctionne pas**
- Vérifier support WebGL mobile
- Tester les événements tactiles
- Réduire la complexité 3D

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 License

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📧 Contact

**Thomas Menu** - [thomas.menu@email.com](mailto:thomas.menu@email.com)

**Portfolio Live** - [https://thomasmenu.fr](https://thomasmenu.fr)

**Repository** - [https://github.com/Menu-Thomas/Port-Folio_Map](https://github.com/Menu-Thomas/Port-Folio_Map)

---

### 🎯 Roadmap

- [ ] **v2.1** - Système de particules avancé
- [ ] **v2.2** - Support multi-langue
- [ ] **v2.3** - Mode réalité virtuelle
- [ ] **v2.4** - Editor de portfolio en temps réel
- [ ] **v3.0** - Framework de portfolio 3D réutilisable

**Construit avec ❤️ et beaucoup de café ☕** Preview
![image](https://github.com/user-attachments/assets/e224a4b4-b69e-462c-85dc-e3852a691daf)

Features
Interactive Navigation: Explore different sections by clicking on hexagons
Fluid Animations: Animated ocean waves, hover effects on hexagons, and smooth transitions
Responsive Interface: Adapts to all screen sizes with a dynamic sidebar
Immersive 3D Design: Complete 3D environment with dynamic lighting and 360° background
Themed Content Areas: Each zone (forest, desert, swamp, fields) symbolically represents an aspect of my professional journey
Interactive Guide System: Clippy-inspired tutorial guide for new users to learn the interface
Map Sections
Home: General introduction and overview
CV: Professional background and skills
Projects: Portfolio of completed work
Contact: Get in touch form
Themed Areas:
Forest: Complexity and richness of continuous learning
Desert: Technology watch and strategic thinking
Swamp: Technical challenges and problem-solving
Fields: Growth, creativity, and personal projects
Services Offered
👋 Development Engineer (Unity3D, Web, Software) — I help project owners move from idea to implementation, with methodology, vision, and technical expertise.

💡 Do you have an idea? Let's make sure it's as clear for a developer as it is for you.

✨ I love exploring the potential of projects. Imagining what they can become and what they can bring to the world.

📌 But an idea, however brilliant, needs a well-thought-out roadmap to become reality.

Together, we will:
✅ Clarify your project – put it into words and structure
✅ Establish a coherent roadmap – key stages that remain flexible
✅ Translate your vision for technical teams
✅ Anticipate developments – plan for integration from the start
✅ Maximize chances of success – not just feasible, but remarkable
🎯 Then? I can also take charge of or co-develop your application, tool, or prototype: Unity3D, web, business software, simulation, etc.

Technologies Used
Three.js: 3D engine for the web
JavaScript: Interaction programming
HTML/CSS: Page structure and styling
GLTF/GLB: 3D model format

## How to Run

### Local Development
1. Clone this repository
2. Open `index.html` in your browser
3. For development, use a local server (like Live Server for VS Code)

### GitHub Pages Deployment
This project is configured for automatic deployment to GitHub Pages:

1. **Push to main branch**: The site will automatically deploy via GitHub Actions
2. **Access your site**: Visit `https://[your-username].github.io/Port-Folio_Map/`
3. **Enable GitHub Pages**:
   - Go to your repository settings
   - Navigate to "Pages" section
   - Set source to "GitHub Actions"

The deployment workflow is configured in `.github/workflows/deploy.yml` and will:
- Automatically build and deploy on every push to main
- Serve all static assets correctly
- Handle 3D models and textures

### Requirements
- Modern browser with WebGL support
- Internet connection (for CDN dependencies: Three.js, GSAP)

Free Initial Consultation
Do you have an idea but don't know where to start? I offer a free call to discuss it, no obligation. 🎁 You'll walk away with concrete initial advice and a clearer vision of your project.

Contact
Use the contact section in the portfolio or send me a message directly to discuss your projects.
