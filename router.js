// ========================================
//   DONGTUBE URL ROUTER SYSTEM
// ========================================

class URLRouter {
  constructor() {
    this.baseURL = window.location.origin;
    this.init();
  }

  init() {
    this.handleInitialRoute();
    this.bindEvents();
  }

  // Convert anime title to URL-friendly slug
  titleToSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim('-'); // Remove leading/trailing hyphens
  }

  // Convert slug back to search for anime
  slugToTitle(slug) {
    return slug
      .replace(/-/g, ' ')
      .toLowerCase();
  }

  // Generate clean watch URL
  generateWatchURL(anime, episode = 1) {
    const slug = this.titleToSlug(anime.title);
    return `${this.baseURL}/watch/${slug}=id:${anime.id}&ep=${episode}`;
  }

  // Generate clean home URL
  generateHomeURL() {
    return `${this.baseURL}/dongtube`;
  }

  // Parse current URL and extract parameters
  parseCurrentURL() {
    const path = window.location.pathname;
    const search = window.location.search;
    
    // Handle watch page URLs
    if (path.includes('/watch/') || path.includes('watch.html')) {
      return this.parseWatchURL(path, search);
    }
    
    // Handle home page URLs
    if (path === '/' || path.includes('index.html') || path.includes('/dongtube')) {
      return { type: 'home' };
    }

    return { type: 'unknown' };
  }

  // Parse watch URL patterns
  parseWatchURL(path, search) {
    let animeId = null;
    let episode = 1;

    // Try new format first: /watch/anime-title=id:2&ep=1
    const newFormatMatch = path.match(/\/watch\/(.+)=id:(\d+)(&ep=(\d+))?/);
    if (newFormatMatch) {
      animeId = parseInt(newFormatMatch[2]);
      episode = newFormatMatch[4] ? parseInt(newFormatMatch[4]) : 1;
      return { type: 'watch', animeId, episode };
    }

    // Fallback to old format: watch.html?id=2&ep=1
    const urlParams = new URLSearchParams(search);
    if (urlParams.has('id')) {
      animeId = parseInt(urlParams.get('id'));
      episode = urlParams.has('ep') ? parseInt(urlParams.get('ep')) : 1;
      return { type: 'watch', animeId, episode };
    }

    return { type: 'watch', animeId: 1, episode: 1 };
  }

  // Handle initial page load routing
  handleInitialRoute() {
    const route = this.parseCurrentURL();
    
    switch (route.type) {
      case 'watch':
        this.loadWatchPage(route.animeId, route.episode);
        break;
      case 'home':
        this.loadHomePage();
        break;
      default:
        this.loadHomePage();
    }
  }

  // Load watch page with proper content
  loadWatchPage(animeId, episode) {
    // If we're not on watch page, redirect
    if (!document.getElementById('videoPlayer')) {
      window.location.href = 'watch.html?id=' + animeId + '&ep=' + episode;
      return;
    }

    // Initialize watch controller with parameters
    if (typeof WatchController !== 'undefined') {
      if (watchController) {
        watchController.loadSpecificAnime(animeId, episode);
      }
    }
  }

  // Load home page
  loadHomePage() {
    // If we're not on home page, redirect
    if (!document.getElementById('animeList') && !window.location.pathname.includes('index')) {
      window.location.href = 'index.html';
      return;
    }
  }

  // Navigate to watch page with clean URL
  navigateToWatch(anime, episode = 1) {
    const cleanURL = this.generateWatchURL(anime, episode);
    
    // Update browser history
    window.history.pushState(
      { type: 'watch', animeId: anime.id, episode }, 
      `Watch ${anime.title} - Episode ${episode}`, 
      cleanURL
    );

    // If we're already on watch page, just update content
    if (document.getElementById('videoPlayer') && watchController) {
      watchController.loadSpecificAnime(anime.id, episode);
    } else {
      // Navigate to watch page
      window.location.href = `watch.html?id=${anime.id}&ep=${episode}`;
    }
  }

  // Navigate to home with clean URL
  navigateToHome() {
    const cleanURL = this.generateHomeURL();
    
    window.history.pushState(
      { type: 'home' }, 
      'DongTube - Premium Anime Streaming', 
      cleanURL
    );

    // If not on home page, navigate
    if (!document.getElementById('animeList')) {
      window.location.href = 'index.html';
    }
  }

  // Update current URL without reload
  updateWatchURL(anime, episode) {
    const cleanURL = this.generateWatchURL(anime, episode);
    
    window.history.replaceState(
      { type: 'watch', animeId: anime.id, episode },
      `Watch ${anime.title} - Episode ${episode}`,
      cleanURL
    );
  }

  // Bind browser navigation events
  bindEvents() {
    // Handle browser back/forward buttons
    window.addEventListener('popstate', (event) => {
      if (event.state) {
        switch (event.state.type) {
          case 'watch':
            this.loadWatchPage(event.state.animeId, event.state.episode);
            break;
          case 'home':
            this.loadHomePage();
            break;
        }
      } else {
        // No state, parse URL
        this.handleInitialRoute();
      }
    });

    // Intercept anime card clicks for clean URLs
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.card[data-anime-id]');
      if (card) {
        e.preventDefault();
        const animeId = parseInt(card.dataset.animeId);
        const anime = animeData.find(a => a.id === animeId);
        if (anime) {
          this.navigateToWatch(anime, 1);
        }
      }
    });
  }

  // Generate meta tags for SEO
  updateMetaTags(anime, episode = null) {
    const title = episode 
      ? `Watch ${anime.title} Episode ${episode} - DongTube`
      : `${anime.title} - DongTube Premium Streaming`;
    
    const description = anime.description || `Watch ${anime.title} with HD quality on DongTube`;
    
    // Update page title
    document.title = title;
    
    // Update or create meta tags
    this.updateMetaTag('description', description);
    this.updateMetaTag('og:title', title);
    this.updateMetaTag('og:description', description);
    this.updateMetaTag('og:image', anime.thumb);
    this.updateMetaTag('og:url', window.location.href);
    
    // Twitter card
    this.updateMetaTag('twitter:card', 'summary_large_image');
    this.updateMetaTag('twitter:title', title);
    this.updateMetaTag('twitter:description', description);
    this.updateMetaTag('twitter:image', anime.thumb);
  }

  // Helper to update meta tags
  updateMetaTag(name, content) {
    let meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    
    if (!meta) {
      meta = document.createElement('meta');
      if (name.startsWith('og:') || name.startsWith('twitter:')) {
        meta.setAttribute('property', name);
      } else {
        meta.setAttribute('name', name);
      }
      document.head.appendChild(meta);
    }
    
    meta.setAttribute('content', content);
  }

  // Generate sitemap data
  generateSitemapURLs() {
    const urls = [];
    
    // Add home page
    urls.push({
      loc: this.generateHomeURL(),
      changefreq: 'daily',
      priority: '1.0'
    });
    
    // Add anime watch pages
    animeData.forEach(anime => {
      anime.episodes.forEach(episode => {
        urls.push({
          loc: this.generateWatchURL(anime, episode.num),
          changefreq: 'weekly',
          priority: '0.8'
        });
      });
    });
    
    return urls;
  }
}

// Initialize URL Router
let urlRouter;