(function(){
  'use strict';

  // Header turns solid black once the page scrolls.
  var header = document.querySelector('.site-header');
  if(header){
    var onScroll = function(){ header.classList.toggle('is-scrolled', window.scrollY > 40); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Mobile menu.
  var navToggle = document.getElementById('navToggle');
  if(navToggle){
    navToggle.addEventListener('click', function(){
      var nav = document.querySelector('nav.primary');
      var open = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open);
      navToggle.textContent = open ? 'CLOSE' : 'MENU';
    });
  }

  // Live spot prices for the metals strip: USD per troy ounce from a keyless
  // public feed (gold-api.com), shown with a rand equivalent from a keyless FX
  // feed (Frankfurter, falling back to open.er-api.com). Items carry
  // data-symbol; any metal the feed does not price stays a name, a missing FX
  // rate leaves USD only, and any failure leaves the strip as it was.
  // Runs before the reduced-motion exit: prices are content, not motion.
  var priceItems = document.querySelectorAll('.marquee-item[data-symbol]');
  if(priceItems.length && window.fetch){
    var symbols = [], seen = {}, usd = {}, zar = 0;
    priceItems.forEach(function(el){ var s = el.getAttribute('data-symbol'); if(!seen[s]){ seen[s] = 1; symbols.push(s); } });
    var fmtUsd = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
    var fmtZar = new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 0 });
    var getJSON = function(url){
      var ctl = window.AbortController ? new AbortController() : null;
      var t = setTimeout(function(){ if(ctl) ctl.abort(); }, 6000);
      return fetch(url, ctl ? { signal: ctl.signal } : undefined)
        .then(function(r){ if(!r.ok) throw 0; return r.json(); })
        .then(function(d){ clearTimeout(t); return d; }, function(e){ clearTimeout(t); throw e; });
    };
    var paintPrices = function(){
      symbols.forEach(function(sym){
        var v = usd[sym];
        if(!v) return;
        document.querySelectorAll('.marquee-item[data-symbol="' + sym + '"]').forEach(function(el){
          var p = el.querySelector('.marquee-price');
          if(!p){
            p = document.createElement('b'); p.className = 'marquee-price';
            el.insertBefore(p, el.querySelector('.marquee-dot'));
          }
          p.textContent = '$' + fmtUsd.format(v);
          if(zar){
            var z = document.createElement('span');
            z.className = 'marquee-zar'; z.textContent = 'R' + fmtZar.format(v * zar);
            p.appendChild(z);
          }
          var u = document.createElement('small'); u.textContent = '/oz'; p.appendChild(u);
          p.title = 'Spot price per troy ounce' + (zar ? ' (rand at ' + zar.toFixed(2) + ' per US dollar)' : '');
        });
      });
      document.querySelectorAll('.marquee-section').forEach(function(sec){ sec.dispatchEvent(new Event('sbpm:prices')); });
    };
    var validRate = function(r){ r = Number(r); return isFinite(r) && r > 1 && r < 1000 ? r : 0; };
    var fetchRate = function(){
      return getJSON('https://api.frankfurter.dev/v1/latest?base=USD&symbols=ZAR')
        .then(function(d){ return validRate(d && d.rates && d.rates.ZAR); })
        .catch(function(){ return 0; })
        .then(function(r){
          if(r) return r;
          return getJSON('https://open.er-api.com/v6/latest/USD')
            .then(function(d){ return validRate(d && d.rates && d.rates.ZAR); })
            .catch(function(){ return 0; });
        });
    };
    var setStatus = function(state, text){
      document.querySelectorAll('.marquee-live').forEach(function(el){
        el.setAttribute('data-state', state);
        el.querySelector('.marquee-live-text').textContent = text;
      });
    };
    var fetchSpot = function(sym){
      return getJSON('https://api.gold-api.com/price/' + sym)
        .then(function(d){ var v = d && Number(d.price); if(!isFinite(v) || v <= 0) throw 0; return v; })
        .catch(function(){
          // backup feed: mid of bid/ask
          return getJSON('https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/' + sym + '/USD')
            .then(function(d){
              var q = d && d[0] && d[0].spreadProfilePrices && d[0].spreadProfilePrices[0];
              var v = q && (Number(q.bid) + Number(q.ask)) / 2;
              if(!isFinite(v) || v <= 0) throw 0;
              return v;
            });
        });
    };
    var flash = function(sym, dir){
      if(!dir) return;
      document.querySelectorAll('.marquee-item[data-symbol="' + sym + '"] .marquee-price').forEach(function(p){
        p.classList.remove('up', 'down'); void p.offsetWidth; p.classList.add(dir);
        setTimeout(function(){ p.classList.remove('up', 'down'); }, 1800);
      });
    };
    var refreshPrices = function(){
      if(!Object.keys(usd).length) setStatus('loading', 'Loading prices');
      fetchRate().then(function(r){ if(r){ zar = r; paintPrices(); } });
      Promise.all(symbols.map(function(sym){
        return fetchSpot(sym).then(function(v){
          var dir = usd[sym] ? (v > usd[sym] ? 'up' : v < usd[sym] ? 'down' : '') : '';
          usd[sym] = v; paintPrices(); flash(sym, dir);
        }, function(){});
      })).then(function(){
        if(Object.keys(usd).length){
          setStatus('live', 'Live · ' + new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }));
        }else{
          setStatus('off', 'Prices unavailable');
        }
      });
    };
    refreshPrices();
    setInterval(function(){ if(!document.hidden) refreshPrices(); }, 300000);
  }

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Scroll progress bar, back-to-top button, and a header that tucks away on the way down.
  var bar = document.createElement('div');
  bar.className = 'scroll-progress'; bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  var toTop = document.createElement('button');
  toTop.type = 'button'; toTop.className = 'to-top'; toTop.setAttribute('aria-label', 'Back to top');
  toTop.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>';
  toTop.addEventListener('click', function(){ window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); });
  document.body.appendChild(toTop);
  var lastY = window.scrollY, ticking = false;
  function onScrollFx(){
    ticking = false;
    var y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
    toTop.classList.toggle('is-shown', y > 700);
    if(header){
      var navOpen = document.querySelector('nav.primary.open');
      if(y > 320 && y > lastY + 4 && !navOpen) header.classList.add('is-hidden');
      else if(y < lastY - 4 || y <= 320) header.classList.remove('is-hidden');
    }
    lastY = y;
  }
  window.addEventListener('scroll', function(){ if(!ticking){ ticking = true; requestAnimationFrame(onScrollFx); } }, { passive: true });
  onScrollFx();

  // Hero slider: crossfades between .hero-slide elements. Arrows, dots, swipe and the arrow keys step
  // through them; it advances by itself every 6s unless reduced motion is on or the pointer is over it.
  document.querySelectorAll('.hero').forEach(function(hero){
    var slides = hero.querySelectorAll('.hero-slide');
    if(slides.length < 2) return;
    var i = 0, hover = false, timer;
    var dots = document.createElement('div');
    dots.className = 'hero-dots';
    var dotEls = [].map.call(slides, function(_, n){
      var d = document.createElement('button');
      d.type = 'button'; d.setAttribute('aria-label', 'Go to slide ' + (n + 1));
      d.addEventListener('click', function(){ go(n); restart(); });
      dots.appendChild(d); return d;
    });
    hero.appendChild(dots);
    function go(n){
      slides[i].classList.remove('is-active'); dotEls[i].classList.remove('is-active');
      i = (n + slides.length) % slides.length;
      slides[i].classList.add('is-active'); dotEls[i].classList.add('is-active');
    }
    function restart(){
      clearInterval(timer);
      if(!reduceMotion) timer = setInterval(function(){ if(!hover && !document.hidden) go(i + 1); }, 6000);
    }
    dotEls[0].classList.add('is-active');
    var prev = hero.querySelector('.hero-arrow.prev'), next = hero.querySelector('.hero-arrow.next');
    if(prev) prev.addEventListener('click', function(){ go(i - 1); restart(); });
    if(next) next.addEventListener('click', function(){ go(i + 1); restart(); });
    hero.addEventListener('mouseenter', function(){ hover = true; });
    hero.addEventListener('mouseleave', function(){ hover = false; });
    var x0 = null;
    hero.addEventListener('touchstart', function(e){ x0 = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener('touchend', function(e){
      if(x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if(Math.abs(dx) > 40){ go(i + (dx < 0 ? 1 : -1)); restart(); }
    });
    document.addEventListener('keydown', function(e){
      if(e.target.closest && e.target.closest('input, textarea, select')) return;
      var r = hero.getBoundingClientRect();
      if(r.bottom < 0 || r.top > window.innerHeight) return;
      if(e.key === 'ArrowLeft'){ go(i - 1); restart(); }
      if(e.key === 'ArrowRight'){ go(i + 1); restart(); }
    });
    restart();
  });

  // Metals marquee: the -50% loop is only seamless if one group is at least as
  // wide as the viewport, so repeat the items (aria-hidden clones, identical in
  // both groups so the loop distance stays exact) until it is. Re-fits on resize.
  document.querySelectorAll('.marquee-section').forEach(function(sec){
    var groups = sec.querySelectorAll('.marquee-group');
    if(groups.length !== 2) return;
    var base = [].slice.call(groups[0].children);
    function fit(){
      sec.querySelectorAll('.m-clone').forEach(function(n){ n.remove(); });
      for(var guard = 0; guard < 8 && groups[0].offsetWidth < sec.clientWidth; guard++){
        for(var g = 0; g < 2; g++){
          base.forEach(function(item){
            var c = item.cloneNode(true);
            c.classList.add('m-clone'); c.setAttribute('aria-hidden', 'true');
            groups[g].appendChild(c);
          });
        }
      }
    }
    sec.addEventListener('sbpm:prices', fit);
    fit();
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    var resizeTimer;
    window.addEventListener('resize', function(){ clearTimeout(resizeTimer); resizeTimer = setTimeout(fit, 150); });
  });

  // Stat figures count up once, the first time seen (short figures only: 40+, R60m+, 19+).
  function countUp(el){
    var m = el.textContent.match(/^(\D*)(\d{1,3})(\D*)$/);
    if(!m) return;
    var pre = m[1], end = parseInt(m[2], 10), post = m[3], t0 = null, dur = 1100;
    function step(t){
      if(t0 === null) t0 = t;
      var p = Math.min((t - t0) / dur, 1), eased = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + Math.round(end * eased) + post;
      if(p < 1) requestAnimationFrame(step);
    }
    el.textContent = pre + '0' + post;
    requestAnimationFrame(step);
  }

  if(reduceMotion || !('IntersectionObserver' in window)) return;

  // Scroll reveal: each content block fades up once as it enters view; grids and stat rows stagger.
  var targets = document.querySelectorAll('section:not(.hero), .page-head');
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
        entry.target.querySelectorAll('.stat-num').forEach(countUp);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  targets.forEach(function(el){ el.classList.add('reveal'); io.observe(el); });
})();
