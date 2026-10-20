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
    var refreshPrices = function(){
      fetchRate().then(function(r){ if(r){ zar = r; paintPrices(); } });
      symbols.forEach(function(sym){
        getJSON('https://api.gold-api.com/price/' + sym)
          .then(function(d){
            var v = d && Number(d.price);
            if(!isFinite(v) || v <= 0) return;
            usd[sym] = v; paintPrices();
          })
          .catch(function(){});
      });
    };
    refreshPrices();
    setInterval(function(){ if(!document.hidden) refreshPrices(); }, 300000);
  }

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Hero slider: crossfades between .hero-slide elements; arrows step through them,
  // and it advances by itself every 6s unless reduced motion is on or the pointer is over it.
  document.querySelectorAll('.hero').forEach(function(hero){
    var slides = hero.querySelectorAll('.hero-slide');
    if(slides.length < 2) return;
    var i = 0, hover = false, timer;
    function go(n){
      slides[i].classList.remove('is-active');
      i = (n + slides.length) % slides.length;
      slides[i].classList.add('is-active');
    }
    var prev = hero.querySelector('.hero-arrow.prev'), next = hero.querySelector('.hero-arrow.next');
    if(prev) prev.addEventListener('click', function(){ go(i - 1); });
    if(next) next.addEventListener('click', function(){ go(i + 1); });
    hero.addEventListener('mouseenter', function(){ hover = true; });
    hero.addEventListener('mouseleave', function(){ hover = false; });
    if(!reduceMotion) timer = setInterval(function(){ if(!hover && !document.hidden) go(i + 1); }, 6000);
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

  if(reduceMotion || !('IntersectionObserver' in window)) return;

  // Scroll reveal: each content block fades up once as it enters view.
  var targets = document.querySelectorAll('section:not(.hero), .page-head');
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  targets.forEach(function(el){ el.classList.add('reveal'); io.observe(el); });
})();
