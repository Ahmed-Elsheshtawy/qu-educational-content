/*
 * Google AdSense helper
 * ---------------------
 * AdSense's own snippet is just:
 *     (adsbygoogle = window.adsbygoogle || []).push({});
 * placed once per <ins class="adsbygoogle"> block.
 *
 * That is fine on a normal page load (courseDetail.html), but index.html is a
 * single-page app: the Home view can be hidden (display:none) when the visitor
 * deep-links to /about, /submit, etc. An <ins> that AdSense measures while it is
 * hidden renders at 0px wide and never fills again.
 *
 * This helper only initialises ad units that are actually visible, and re-checks
 * after client-side navigation so Home-view ads still appear when the user
 * navigates back to "/".
 */

function initVisibleAds() {
  const units = document.querySelectorAll(
    'ins.adsbygoogle:not([data-adsbygoogle-status])'
  );

  units.forEach((unit) => {
    // offsetParent is null when the element (or an ancestor) is display:none
    const visible =
      unit.offsetParent !== null && unit.getBoundingClientRect().width > 0;
    if (!visible) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.warn('AdSense: could not initialise an ad unit', err);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVisibleAds);
} else {
  initVisibleAds();
}

// The SPA router swaps views on link clicks and browser back/forward.
// Give the DOM a tick to update visibility, then try again.
window.addEventListener('popstate', () => setTimeout(initVisibleAds, 100));
document.addEventListener('click', (e) => {
  if (e.target.closest('a[href^="/"]')) setTimeout(initVisibleAds, 150);
});
