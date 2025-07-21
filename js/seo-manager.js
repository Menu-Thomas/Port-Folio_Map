/**
 * SEO and Metadata Manager
 * Handles dynamic meta tags, OpenGraph data, and structured data
 */

class SEOManager {
  constructor() {
    this.baseTitle = 'Portfolio Thomas Menu';
    this.baseDescription = 'Portfolio interactif 3D de Thomas Menu - Développeur Full-Stack spécialisé en Unity, C#, Python, et technologies web modernes.';
    this.baseImage = './public/portfolio-preview.jpg';
    this.baseUrl = window.location.origin;
  }

  updatePageMeta(data) {
    const {
      title = this.baseTitle,
      description = this.baseDescription,
      image = this.baseImage,
      type = 'website',
      url = window.location.href
    } = data;

    // Update document title
    document.title = title;

    // Update or create meta tags
    this.setMetaTag('description', description);
    this.setMetaTag('author', 'Thomas Menu');
    this.setMetaTag('keywords', 'portfolio, développeur, Unity, C#, Python, JavaScript, 3D, web development');
    
    // Open Graph tags
    this.setMetaProperty('og:title', title);
    this.setMetaProperty('og:description', description);
    this.setMetaProperty('og:image', image);
    this.setMetaProperty('og:url', url);
    this.setMetaProperty('og:type', type);
    this.setMetaProperty('og:site_name', 'Portfolio Thomas Menu');

    // Twitter Card tags
    this.setMetaProperty('twitter:card', 'summary_large_image');
    this.setMetaProperty('twitter:title', title);
    this.setMetaProperty('twitter:description', description);
    this.setMetaProperty('twitter:image', image);

    // Additional SEO tags
    this.setMetaTag('robots', 'index, follow');
    this.setMetaTag('viewport', 'width=device-width, initial-scale=1.0');
  }

  setMetaTag(name, content) {
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = name;
      document.head.appendChild(meta);
    }
    meta.content = content;
  }

  setMetaProperty(property, content) {
    let meta = document.querySelector(`meta[property="${property}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('property', property);
      document.head.appendChild(meta);
    }
    meta.content = content;
  }

  generateStructuredData() {
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": "Thomas Menu",
      "jobTitle": "Développeur Full-Stack",
      "url": this.baseUrl,
      "image": this.baseImage,
      "sameAs": [
        "https://linkedin.com/in/thomas-menu",
        "https://github.com/Menu-Thomas"
      ],
      "knowsAbout": [
        "Unity Development",
        "C# Programming",
        "Python Development", 
        "JavaScript",
        "Web Development",
        "3D Programming",
        "Game Development"
      ],
      "worksFor": {
        "@type": "Organization",
        "name": "Freelance Developer"
      }
    };

    // Add or update structured data script
    let script = document.querySelector('script[type="application/ld+json"]');
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(structuredData, null, 2);
  }

  updateForSection(section) {
    const sectionData = {
      'home': {
        title: 'Accueil - Portfolio Thomas Menu',
        description: 'Découvrez le portfolio interactif 3D de Thomas Menu, développeur passionné par les technologies Unity, web et l\'innovation.',
      },
      'cv': {
        title: 'CV & Compétences - Thomas Menu',
        description: 'Parcourez mes compétences techniques : Unity, C#, Python, JavaScript, et découvrez mon parcours professionnel.',
      },
      'projects': {
        title: 'Projets - Portfolio Thomas Menu',
        description: 'Explorez mes projets de développement : applications Unity, sites web, projets IoT et réalisations techniques.',
      },
      'contact': {
        title: 'Contact - Thomas Menu',
        description: 'Contactez-moi pour discuter de vos projets de développement Unity, web ou mobile.',
      },
      'forge': {
        title: 'Conception & Design - Thomas Menu',
        description: 'Découvrez mes processus de conception et de design pour les applications et interfaces utilisateur.',
      }
    };

    const data = sectionData[section] || {};
    this.updatePageMeta(data);
  }

  addFavicons() {
    // Add various favicon sizes
    const faviconSizes = [16, 32, 48, 64, 96, 128, 192, 512];
    
    faviconSizes.forEach(size => {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/png';
      link.sizes = `${size}x${size}`;
      link.href = `./public/favicon-${size}x${size}.png`;
      document.head.appendChild(link);
    });

    // Add apple touch icon
    const appleIcon = document.createElement('link');
    appleIcon.rel = 'apple-touch-icon';
    appleIcon.href = './public/apple-touch-icon.png';
    document.head.appendChild(appleIcon);

    // Add manifest for PWA
    const manifest = document.createElement('link');
    manifest.rel = 'manifest';
    manifest.href = './manifest.json';
    document.head.appendChild(manifest);
  }

  init() {
    this.updatePageMeta({});
    this.generateStructuredData();
    this.addFavicons();
  }
}

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SEOManager;
} else {
  window.SEOManager = SEOManager;
}
