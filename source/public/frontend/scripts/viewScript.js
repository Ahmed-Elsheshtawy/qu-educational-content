// View router - handle page routing based on URL path
(function () {
    const path = window.location.pathname;
    const views = ['home-view', 'about-view', 'submit-view', 'course-submit-view'];
    
    // Hide all views
    views.forEach(viewId => {
        const el = document.getElementById(viewId);
        if (el) el.style.display = 'none';
    });
    
    // Show the appropriate view
    if (path === '/about') {
        document.getElementById('about-view').style.display = 'block';
    } else if (path === '/submit') {
        document.getElementById('submit-view').style.display = 'block';
    } else if (path === '/course-submit') {
        document.getElementById('course-submit-view').style.display = 'block';
    } else {
        document.getElementById('home-view').style.display = 'block';
    }
})();
