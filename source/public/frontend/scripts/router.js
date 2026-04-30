// Simple SPA Router for Masdar
class Router {
    constructor() {
        this.routes = {
            '/': 'home-view',
            '/about': 'about-view',
            '/submit': 'submit-view',
            '/course-submit': 'course-submit-view'
        };
        
        this.init();
    }
    
    init() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', () => this.handleRoute());
        
        // Intercept navigation clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="/"]');
            if (link && !link.hasAttribute('target')) {
                const href = link.getAttribute('href');
                // Only handle routes that are in our SPA
                if (this.routes[href]) {
                    e.preventDefault();
                    this.navigate(href);
                }
            }
        });
        
        // Handle initial route
        this.handleRoute();
    }
    
    navigate(path) {
        window.history.pushState({}, '', path);
        this.handleRoute();
    }
    
    handleRoute() {
        // Normalize the path (remove trailing slashes, convert to lowercase)
        let path = window.location.pathname.replace(/\/+$/, '') || '/';
        
        const viewId = this.routes[path] || 'home-view';
        
        // Hide all views
        Object.values(this.routes).forEach(id => {
            const view = document.getElementById(id);
            if (view) view.style.display = 'none';
        });
        
        // Show the active view
        const activeView = document.getElementById(viewId);
        if (activeView) {
            activeView.style.display = 'block';
            this.updateNavigation(path);
            this.updatePageTitle(path);
            window.scrollTo(0, 0);
        }
    }
    
    updateNavigation(path) {
        // Update active nav link styling
        document.querySelectorAll('.nav-link').forEach(link => {
            // First remove all active classes
            link.classList.remove('active');
        });
        
        // Then add active class only to the matching link
        document.querySelectorAll('.nav-link').forEach(link => {
            const href = link.getAttribute('href');
            // Normalize href for comparison (remove trailing slashes)
            const normalizedHref = href.replace(/\/+$/, '') || '/';
            if (normalizedHref === path) {
                link.classList.add('active');
            }
        });
    }
    
    updatePageTitle(path) {
        const titles = {
            '/': 'Masdar - Qatar University Resources',
            '/about': 'About - Masdar',
            '/submit': 'Submit Resource - Masdar',
            '/course-submit': 'Request New Course - Masdar'
        };
        document.title = titles[path] || titles['/'];
    }
}

// Initialize router when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new Router());
} else {
    new Router();
}

export default Router;
