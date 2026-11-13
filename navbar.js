/* ============================================================
   Glass Pill Navbar — behavior. Pairs with navbar.css.
   Extracted from noahgallego.com's shared-header.js + site-effects.js
   (nav sections): scroll morph, sliding active blob with liquid
   squash, cross-page pill handoff, mobile menu, page-exit fade.

   HOW TO USE
   1. Copy navbar.css and navbar.js into your site.
   2. On every page, in <head>:
        <link rel="stylesheet" href="navbar.css">
        <script src="navbar.js" defer></script>
   3. Put <div data-navbar></div> right after <body> opens (optional —
      the script prepends to <body> if the placeholder is missing).
   4. Edit NAVBAR_CONFIG below: your name, your links, done.
      The active-link pill is detected automatically from the URL;
      override per page with <div data-navbar data-navbar-current="About">.
   ============================================================ */

window.NAVBAR_CONFIG = window.NAVBAR_CONFIG || {
    /* Your name — shown next to the monogram and used to build it. */
    name: "Gael Carrillo",

    /* Your pages, in the order they should appear. `href` is a root- or
       relative path; the one matching the current URL gets the pill. */
    links: [
        { label: "Home",     href: "portfolio.html" },
        { label: "Projects", href: "projects.html" },
        { label: "About",    href: "about.html" },
        { label: "Contact",  href: "contact.html" },
        { label: "Résumé",   href: "resume.html" }
    ],

    /* Optional: one accent color for the pill + focus ring (any CSS color).
       Leave null to keep the default blue→violet gradient. */
    accent: "#A34A2A",

    /* Optional: your own SVG markup for the brand mark (viewBox ~ 0 0 40 40,
       currentColor for the ink). Leave null for the auto monogram:
       your initials on a gradient squircle. */
    logoSvg: null,

    /* Optional: Google Analytics 4 measurement ID (format G-XXXXXXXXXX).
       Paste your ID here to enable analytics on every page; leave null
       to stay untracked. Create a free property at https://analytics.google.com */
    ga4MeasurementId: null,

    /* Optional: self-hosted stats beacon. Fires an invisible pixel to this
       path on every page load; silently no-ops until the private stats app
       (the /stats directory, which never touches the repo) is uploaded to
       the server. Null disables. */
    statsBeacon: '/stats/collect.php'
};

(function () {
    'use strict';

    var cfg = window.NAVBAR_CONFIG || {};
    var doc = document.documentElement;
    doc.classList.add('nk-js');

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var isTouch = window.matchMedia('(pointer: coarse)').matches;

    /* ---------- Build the brand lockup ---------- */

    function monogramSvg() {
        if (cfg.logoSvg) return cfg.logoSvg;
        var words = String(cfg.name || '?').trim().split(/\s+/);
        var initials = (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase();
        var id = 'nkMono' + Math.random().toString(36).slice(2, 8);
        var g1 = cfg.accent || '#0a84ff';
        var g2 = cfg.accent || '#5e5ce6';
        return '' +
            '<svg class="brand__mark" viewBox="0 0 40 40" aria-hidden="true" focusable="false">' +
                '<defs>' +
                    '<linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1">' +
                        '<stop offset="0" stop-color="' + g1 + '"/>' +
                        '<stop offset="1" stop-color="' + g2 + '"/>' +
                    '</linearGradient>' +
                '</defs>' +
                '<rect width="40" height="40" rx="12" fill="url(#' + id + ')"/>' +
                '<text x="20" y="27" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, \'SF Pro Text\', \'Segoe UI\', Roboto, Arial, sans-serif" font-size="17" font-weight="700" fill="#fff" letter-spacing="-0.5">' + initials + '</text>' +
            '</svg>';
    }

    function wordmarkHtml() {
        var letters = String(cfg.name || '').split('').map(function (ch, i) {
            var c = ch === ' ' ? '&nbsp;' : ch.replace(/</g, '&lt;');
            return '<span class="l" style="--i:' + i + '" aria-hidden="true">' + c + '</span>';
        }).join('');
        return '<span class="brand__word">' + letters + '</span>';
    }

    /* ---------- Inject the nav ---------- */

    function splitHref(href) {
        var s = href.split('#')[0];
        var q = s.indexOf('?');
        return q === -1
            ? { path: s, search: '' }
            : { path: s.slice(0, q), search: s.slice(q) };
    }

    function currentLabel() {
        var overrideEl = document.querySelector('[data-navbar-current]');
        if (overrideEl) return overrideEl.getAttribute('data-navbar-current');
        var here = location.pathname.replace(/^\/+|\/+$/g, '') || '/';
        var matched = null, tier = 4;
        (cfg.links || []).forEach(function (l) {
            var t = splitHref(l.href);
            var p = t.path.replace(/^\/+|\/+$/g, '') || '/';
            if (p !== here) return;
            var hash = l.href.indexOf('#') !== -1 ? l.href.split('#').slice(1).join('#') : '';
            /* Rank: exact hash match > plain link > stale hash link.
               First (best-tier) match wins so multiple links to one page
               don't collapse onto the last one. */
            var tTier = hash ? (( '#' + hash === location.hash) ? 1 : 3) : 2;
            if (tTier < tier) { tier = tTier; matched = l.label; }
        });
        /* Same path, no query match: any link on this path owns the page. */
        if (!matched) {
            (cfg.links || []).forEach(function (l) {
                var p = splitHref(l.href).path.replace(/^\/+|\/+$/g, '') || '/';
                if (p === here) matched = l.label;
            });
        }
        /* Sub-paths belong to their nearest top section. */
        if (!matched) {
            var best = 0;
            (cfg.links || []).forEach(function (l) {
                var p = splitHref(l.href).path.replace(/^\/+|\/+$/g, '');
                if (p && p !== '/' && here.indexOf(p) === 0 && p.length > best) {
                    best = p.length;
                    matched = l.label;
                }
            });
        }
        if (!matched && (cfg.links || []).length) matched = cfg.links[0].label;
        return matched;
    }

    function build() {
        var mount = document.querySelector('[data-navbar]');
        var current = currentLabel();

        /* Site-wide analytics: this script loads on every page, so the
           tag fires everywhere once an ID is set in NAVBAR_CONFIG. */
        if (cfg.ga4MeasurementId) {
            var gaId = String(cfg.ga4MeasurementId);
            var gaScript = document.createElement('script');
            gaScript.async = true;
            gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gaId);
            document.head.appendChild(gaScript);
            window.dataLayer = window.dataLayer || [];
            window.gtag = function () { window.dataLayer.push(arguments); };
            window.gtag('js', new Date());
            window.gtag('config', gaId);
        }

        /* Self-hosted stats: fire-and-forget pixel. Failures (e.g. the
           app not uploaded yet) are absorbed quietly on purpose. */
        if (cfg.statsBeacon) {
            var ref = document.referrer || '';
            if (location.origin && ref.indexOf(location.origin) === 0) { ref = ''; }
            var page = location.pathname.replace(/^\/+|\/+$/g, '') || 'home';
            var px = new Image();
            px.src = cfg.statsBeacon
                + '?p=' + encodeURIComponent(page)
                + '&r=' + encodeURIComponent(ref)
                + '&_=' + Date.now();
        }

        var links = (cfg.links || []).map(function (l) {
            var cur = l.label === current ? ' aria-current="page"' : '';
            return '<li><a href="' + l.href + '"' + cur + '>' + l.label + '</a></li>';
        }).join('');

        var html = '' +
            '<a class="skip-link" href="#main">Skip to content</a>' +
            '<nav class="site-nav">' +
                '<a class="site-nav__brand" aria-label="' + (cfg.name || 'Home') + ' - home" href="' + ((cfg.links && cfg.links.length ? cfg.links[0].href : '/') ) + '">' +
                    '<span class="brand-lockup">' + monogramSvg() + wordmarkHtml() + '</span>' +
                '</a>' +
                '<input type="checkbox" id="nav-toggle" class="nav-toggle">' +
                '<label for="nav-toggle" class="nav-toggle-label" aria-label="Menu"><span></span><span></span><span></span></label>' +
                '<ul class="site-nav__links">' + links + '</ul>' +
            '</nav>';

        if (mount) { mount.outerHTML = html; }
        else { document.body.insertAdjacentHTML('afterbegin', html); }

        var nav = document.querySelector('.site-nav');
        if (nav && cfg.accent) {
            nav.style.setProperty('--accent', cfg.accent);
            nav.style.setProperty('--pill-1', cfg.accent);
            nav.style.setProperty('--pill-2', cfg.accent);
        }

        /* Cross-page handoff: if the previous page handed off a compact
           pill (see initBehavior), paint this one compact before first
           paint so the spring release below is a movement, not a jump. */
        try {
            var entry = JSON.parse(sessionStorage.getItem('nkNavPill') || 'null');
            var navType = (performance.getEntriesByType('navigation')[0] || {}).type;
            if (entry && entry.compact && Date.now() - entry.t < 4000 &&
                (!navType || navType === 'navigate') &&
                !location.hash && window.scrollY <= 24 && !reduced) {
                nav.classList.add('nav--scrolled');
                nav.setAttribute('data-nav-enter', '');
            }
        } catch (e) {}

        /* Close the mobile menu after choosing a link. */
        var toggle = document.getElementById('nav-toggle');
        if (toggle) {
            nav.addEventListener('click', function (e) {
                var a = e.target && e.target.closest && e.target.closest('a');
                if (a && toggle.checked) toggle.checked = false;
            });
        }

        initBehavior();
    }

    /* ---------- Behavior: morph, handoff, sliding blob, exit fade ---------- */

    function initBehavior() {
        var nav = document.querySelector('.site-nav');
        if (!nav) return;

        /* A bfcache restore should never return to a half-faded page. */
        window.addEventListener('pageshow', function () {
            doc.classList.remove('nk-page-leaving');
        });

        /* Wing-style morph: wide pill at the top, compact pill on scroll. */
        var NAV_MORPH_MS = 760;
        var navScrolled = false;
        var navMorphUntil = 0;
        var navEntry = null;
        var navExitMetrics = null;
        try {
            navEntry = JSON.parse(sessionStorage.getItem('nkNavPill') || 'null');
            sessionStorage.removeItem('nkNavPill');
        } catch (e) {}

        var entering = nav.hasAttribute('data-nav-enter');
        var onScroll = function () {
            navScrolled = window.scrollY > 24;
            if (entering) return; /* hold the inherited compact state */
            nav.classList.toggle('nav--scrolled', navScrolled);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        if (entering) {
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    entering = false;
                    nav.removeAttribute('data-nav-enter');
                    navMorphUntil = Date.now() + NAV_MORPH_MS;
                    onScroll();
                });
            });
        }

        /* Record the nav state on the way out so the next page inherits it. */
        var samePath = function (p) {
            return p.replace(/\/+$/, '') === location.pathname.replace(/\/+$/, '');
        };
        var navigating = false;
        document.addEventListener('click', function (e) {
            if (e.defaultPrevented || e.button !== 0 ||
                e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            var a = e.target && e.target.closest && e.target.closest('a[href]');
            if (!a || a.hasAttribute('download')) return;
            if (a.target && a.target !== '_self') return;
            if (a.origin !== location.origin) return;
            if (samePath(a.pathname) && a.search === location.search) return;
            var state = { compact: navScrolled ? 1 : 0, t: Date.now() };
            var m = navExitMetrics && navExitMetrics(a.pathname);
            if (m) { state.x = m.x; state.w = m.w; }
            try { sessionStorage.setItem('nkNavPill', JSON.stringify(state)); } catch (err) {}

            /* Calm handoff: brief fade, then navigate. */
            if (!navigating && !reduced) {
                navigating = true;
                e.preventDefault();
                doc.classList.add('nk-page-leaving');
                window.setTimeout(function () { window.location.href = a.href; }, 180);
            }
        });

        /* Sliding active/hover blob. Desktop, fine pointer, motion allowed. */
        var linksList = document.querySelector('.site-nav__links');
        if (nav && linksList && window.matchMedia('(min-width: 761px)').matches && !reduced && !isTouch) {
            var pill = document.createElement('span');
            pill.className = 'site-nav__pill';
            pill.setAttribute('aria-hidden', 'true');
            linksList.prepend(pill);

            var navLinks = Array.prototype.slice.call(linksList.querySelectorAll('li > a'));
            var currentLink = linksList.querySelector('a[aria-current="page"]');

            var placeAt = function (x, w, animate) {
                if (!animate) {
                    pill.style.transition = 'none';
                    pill.style.setProperty('--pill-sx', '1');
                    pill.style.setProperty('--pill-skew', '0deg');
                }
                pill.style.setProperty('--pill-x', x + 'px');
                pill.style.setProperty('--pill-w', w + 'px');
                pill.classList.add('is-visible');
                if (!animate) {
                    void pill.offsetWidth;
                    pill.style.transition = '';
                }
            };

            /* Liquid squash while gliding. */
            var TRANSFORM_MS = 650;
            var blobTimer = null;
            var glideEndsAt = 0;
            var squash = function (a) {
                if (reduced || Date.now() < navMorphUntil) return;
                var curX = parseFloat(pill.style.getPropertyValue('--pill-x')) || 0;
                var m = metrics(a);
                var dist = Math.abs(m.x - curX);
                var dir = m.x >= curX ? 1 : -1;
                var stretch = Math.min(1.22, 1 + dist / 1400);
                var skew = Math.min(6, dist / 90) * -dir;
                pill.style.setProperty('--pill-sx', stretch.toFixed(3));
                pill.style.setProperty('--pill-skew', skew.toFixed(2) + 'deg');
                if (blobTimer) clearTimeout(blobTimer);
                blobTimer = setTimeout(function () {
                    pill.style.setProperty('--pill-sx', '1');
                    pill.style.setProperty('--pill-skew', '0deg');
                }, 520);
            };

            var metrics = function (a) {
                var listBox = linksList.getBoundingClientRect();
                var box = a.getBoundingClientRect();
                return { x: box.left - listBox.left, w: box.width };
            };

            navExitMetrics = function (path) {
                var want = path.replace(/\/+$/, '');
                for (var i = 0; i < navLinks.length; i++) {
                    if (navLinks[i].pathname.replace(/\/+$/, '') === want) {
                        return metrics(navLinks[i]);
                    }
                }
                return null;
            };

            var activeTarget = null;
            var navScrolledAtPlace = false;
            var hoverTarget = null;
            var focusTarget = null;

            /* Scroll fires synthetic enter/leave at a stationary cursor —
               only re-own the pill on a genuinely moved pointer. */
            var lastPX = -1, lastPY = -1;
            window.addEventListener('pointermove', function (e) {
                lastPX = e.clientX;
                lastPY = e.clientY;
            }, { passive: true });
            var isRealGesture = function (e) {
                return e.clientX !== lastPX || e.clientY !== lastPY;
            };

            var place = function (a, animate) {
                if (!a) { pill.classList.remove('is-visible'); activeTarget = null; return; }
                activeTarget = a;
                navScrolledAtPlace = nav.classList.contains('nav--scrolled');
                var m = metrics(a);
                placeAt(m.x, m.w, animate);
                if (animate) {
                    glideEndsAt = Date.now() + TRANSFORM_MS + 80;
                } else {
                    glideEndsAt = 0;
                }
            };

            /* Pick the blob up exactly where the previous page parked it:
               same geometry inherited above, so nothing visibly moves —
               the frame loop then glues it to its link through the morph. */
            if (navEntry && typeof navEntry.x === 'number' && typeof navEntry.w === 'number') {
                pill.style.transition = 'none';
                pill.style.setProperty('--pill-x', navEntry.x + 'px');
                pill.style.setProperty('--pill-w', navEntry.w + 'px');
                pill.classList.add('is-visible');
                void pill.offsetWidth;
                pill.style.transition = '';
            }

            var moveToCurrent = function () { place(currentLink || null, true); };
            var glideToCurrent = function () {
                if (currentLink) squash(currentLink);
                moveToCurrent();
            };
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(glideToCurrent);
            }
            window.addEventListener('load', glideToCurrent);
            moveToCurrent();

            navLinks.forEach(function (a) {
                a.addEventListener('pointerenter', function (e) {
                    if (!isRealGesture(e)) return;
                    hoverTarget = a;
                    squash(a);
                    place(a, true);
                });
                a.addEventListener('focus', function () {
                    focusTarget = a;
                    hoverTarget = a;
                    squash(a);
                    place(a, true);
                });
                a.addEventListener('blur', function () {
                    if (focusTarget === a) focusTarget = null;
                    if (hoverTarget === a) hoverTarget = null;
                });
                a.addEventListener('click', function () {
                    squash(a);
                    place(a, true);
                });
            });
            linksList.addEventListener('pointerleave', function (e) {
                if (isRealGesture(e)) hoverTarget = null;
                else if (hoverTarget) return;
                if (currentLink) squash(currentLink);
                moveToCurrent();
            });

            /* The pill rides its link through the nav's scroll morph,
               snapping only once the spring's deadline has passed. */
            var pillFrame = function () {
                if (!pill.classList.contains('is-visible')) {
                    requestAnimationFrame(pillFrame);
                    return;
                }
                if (hoverTarget && hoverTarget !== focusTarget && lastPX >= 0) {
                    var hb = hoverTarget.getBoundingClientRect();
                    if (lastPX < hb.left || lastPX > hb.right ||
                        lastPY < hb.top  || lastPY > hb.bottom) {
                        hoverTarget = null;
                    }
                }
                var want = focusTarget || hoverTarget || currentLink;
                if (want !== activeTarget) {
                    if (want) { place(want, true); }
                    else { place(null, false); }
                }
                if (activeTarget) {
                    var m = metrics(activeTarget);
                    var curX = parseFloat(pill.style.getPropertyValue('--pill-x')) || 0;
                    var curW = parseFloat(pill.style.getPropertyValue('--pill-w')) || 0;
                    var off = Math.abs(curX - m.x) > 0.5 || Math.abs(curW - m.w) > 0.5;
                    var morphKilledGlide = navScrolledAtPlace !== nav.classList.contains('nav--scrolled') ||
                                           Date.now() < navMorphUntil;
                    if (off && (morphKilledGlide || Date.now() >= glideEndsAt)) {
                        placeAt(m.x, m.w, false);
                        glideEndsAt = 0;
                    }
                }
                requestAnimationFrame(pillFrame);
            };
            if (!reduced) requestAnimationFrame(pillFrame);

            window.addEventListener('resize', function () {
                if (window.matchMedia('(min-width: 761px)').matches) {
                    place(currentLink, false);
                } else {
                    pill.classList.remove('is-visible');
                }
            });
        }
    }

    function ready(fn) {
        if (document.readyState !== 'loading') { fn(); }
        else { document.addEventListener('DOMContentLoaded', fn); }
    }
    ready(build);
})();
