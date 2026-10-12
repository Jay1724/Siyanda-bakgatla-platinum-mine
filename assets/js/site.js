(function(){
  'use strict';

  // Sticky header gains a shadow once the page scrolls — cheap, always on.
  var header = document.querySelector('.site-header');
  if(header){
    var onScroll = function(){
      if(window.scrollY > 4){ header.classList.add('is-scrolled'); }
      else{ header.classList.remove('is-scrolled'); }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Logo intro (homepage, first visit per session). index.html adds
  // html.intro-on in <head> (never under reduced motion) and carries the
  // .intro overlay; its timeline is pure CSS. Here we only lift it (end of
  // sequence, click or Esc) and hold the page's own reveals until it lifts,
  // so the hero animates in as the overlay leaves.
  var intro = document.querySelector('.intro');
  var introGate = Promise.resolve();
  if(intro && document.documentElement.classList.contains('intro-on')){
    introGate = new Promise(function(resolve){
      var ended = false, timer;
      function end(){
        if(ended) return;
        ended = true; clearTimeout(timer);
        document.removeEventListener('keydown', onKey);
        intro.classList.add('is-exiting');
        resolve();
        setTimeout(function(){ document.documentElement.classList.remove('intro-on'); }, 800);
      }
      function onKey(e){ if(e.key === 'Escape') end(); }
      intro.addEventListener('click', end);
      document.addEventListener('keydown', onKey);
      timer = setTimeout(end, 1950);
    });
  }

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduceMotion || !('IntersectionObserver' in window)) return;

  // Scroll reveal: each content block rises into place once it enters view.
  var targets = document.querySelectorAll('section, .page-head, .stat-strip, .tipoff');
  if(!targets.length) return;

  targets.forEach(function(el){ el.classList.add('reveal'); });

  // Scroll-fill: [data-scroll-fill] text becomes words that light up as the
  // block scrolls through the viewport. Text only; the copy stays selectable
  // and readable by assistive tech.
  var fills = [];
  document.querySelectorAll('[data-scroll-fill]').forEach(function(el){
    if(el.children.length) return;
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    var spans = words.map(function(w, i){
      var s = document.createElement('span');
      s.className = 'm-fw'; s.textContent = w;
      el.appendChild(s);
      if(i < words.length - 1) el.appendChild(document.createTextNode(' '));
      return s;
    });
    fills.push({ el: el, words: spans });
  });
  var fillQueued = false;
  function paintFills(){
    fillQueued = false;
    var vh = window.innerHeight;
    fills.forEach(function(f){
      var r = f.el.getBoundingClientRect();
      if(r.bottom < -100 || r.top > vh + 100) return;
      // starts as the block's top reaches 85% of the viewport, done when its bottom reaches 70%
      var p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (vh * 0.15 + r.height)));
      var n = f.words.length;
      f.words.forEach(function(w, i){
        var t = Math.min(1, Math.max(0, p * (n + 3) - i));
        w.style.opacity = (0.16 + 0.84 * t).toFixed(3);
      });
    });
  }
  function queueFill(){ if(!fillQueued){ fillQueued = true; requestAnimationFrame(paintFills); } }
  if(fills.length){
    window.addEventListener('scroll', queueFill, { passive: true });
    window.addEventListener('resize', queueFill);
    paintFills();
  }

  // Goo: drifting gold blobs fused by an SVG threshold filter behind each
  // .band; one larger blob eases toward the pointer. Paused when off-screen,
  // and skipped on small screens where the filter isn't worth the battery.
  var bands = document.querySelectorAll('.band');
  if(bands.length && window.matchMedia('(min-width: 700px)').matches){
    var defs = document.createElement('div');
    defs.className = 'm-svg-defs'; defs.setAttribute('aria-hidden', 'true');
    defs.innerHTML = '<svg width="0" height="0" focusable="false"><defs>' +
      '<filter id="m-goo" color-interpolation-filters="sRGB">' +
      '<feGaussianBlur in="SourceGraphic" stdDeviation="9" result="b"/>' +
      '<feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"/>' +
      '</filter></defs></svg>';
    document.body.appendChild(defs);

    var blobs = [
      { s: 150, x: '6%',  y: '58%', d: '9s',  o: '-2s', dx: '90px',  dy: '-50px' },
      { s: 110, x: '30%', y: '14%', d: '11s', o: '-6s', dx: '-70px', dy: '60px' },
      { s: 180, x: '58%', y: '62%', d: '13s', o: '-4s', dx: '60px',  dy: '-70px' },
      { s: 90,  x: '78%', y: '18%', d: '8s',  o: '-1s', dx: '-50px', dy: '50px' },
      { s: 130, x: '92%', y: '64%', d: '10s', o: '-8s', dx: '-80px', dy: '-40px' }
    ];

    bands.forEach(function(band){
      var goo = document.createElement('div');
      goo.className = 'goo'; goo.setAttribute('aria-hidden', 'true');
      blobs.forEach(function(b){
        var i = document.createElement('i');
        i.style.cssText = '--s:' + b.s + 'px;--x:' + b.x + ';--y:' + b.y + ';--d:' + b.d +
          ';--o:' + b.o + ';--dx:' + b.dx + ';--dy:' + b.dy;
        goo.appendChild(i);
      });
      var follow = document.createElement('i');
      follow.className = 'goo-follow';
      follow.style.cssText = '--s:230px;--x:0px;--y:0px';
      goo.appendChild(follow);
      band.insertBefore(goo, band.firstChild);

      var cx = 0, cy = 0, tx = 0, ty = 0, live = false, touched = false, started = 0;
      function frame(t){
        if(!live) return;
        var w = band.offsetWidth, h = band.offsetHeight;
        if(!touched){
          tx = w * (0.68 + 0.14 * Math.sin(t / 2400));
          ty = h * (0.45 + 0.2 * Math.cos(t / 3100));
        }
        if(!started){ cx = tx; cy = ty; started = 1; }
        cx += (tx - cx) * 0.07; cy += (ty - cy) * 0.07;
        follow.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0) translate(-50%,-50%)';
        requestAnimationFrame(frame);
      }
      band.addEventListener('pointermove', function(e){
        var r = band.getBoundingClientRect();
        tx = e.clientX - r.left; ty = e.clientY - r.top; touched = true;
      });
      new IntersectionObserver(function(entries){
        live = entries[0].isIntersecting;
        goo.classList.toggle('is-live', live);
        if(live) requestAnimationFrame(frame);
      }, { threshold: 0 }).observe(band);
    });
  }

  // Stat figures (strip and hero badge) count up once, the first time seen.
  // Only short figures count (40+, R60m+, 19+); years like 2018 stay put.
  function countUp(el){
    var m = el.textContent.match(/^(\D*)(\d{1,3})(\D*)$/);
    if(!m) return;
    var pre = m[1], end = parseInt(m[2], 10), post = m[3], t0 = null, dur = 900;
    function step(t){
      if(t0 === null) t0 = t;
      var p = Math.min((t - t0) / dur, 1), eased = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + Math.round(end * eased) + post;
      if(p < 1) requestAnimationFrame(step);
    }
    el.textContent = pre + '0' + post;
    requestAnimationFrame(step);
  }

  // Headlines: split each h1 into lines, each in its own mask, so the lines
  // rise in once the block is seen. The plain heading is restored afterwards
  // so it re-wraps normally. Held invisible until split (fonts settled).
  var headlines = document.querySelectorAll('.hero h1, .page-head h1');
  headlines.forEach(function(h){ h.setAttribute('data-split', 'pending'); });

  function prepareHeadline(h){
    if(h.children.length){ h.removeAttribute('data-split'); return; }
    h._original = h.innerHTML;
    var text = h.textContent.replace(/\s+/g, ' ').trim();
    h.textContent = '';
    var words = text.split(' ').map(function(w, i, all){
      var s = document.createElement('span');
      s.className = 'm-word'; s.textContent = w;
      h.appendChild(s);
      if(i < all.length - 1) h.appendChild(document.createTextNode(' '));
      return s;
    });
    var rows = [], top = null;
    words.forEach(function(s){
      if(top === null || Math.abs(s.offsetTop - top) > 2){ rows.push([]); top = s.offsetTop; }
      rows[rows.length - 1].push(s.textContent);
    });
    var sr = document.createElement('span');
    sr.className = 'm-sr'; sr.textContent = text;
    var lines = document.createElement('span');
    lines.className = 'm-lines'; lines.setAttribute('aria-hidden', 'true');
    rows.forEach(function(row, i){
      var mask = document.createElement('span'), inner = document.createElement('span');
      mask.className = 'm-line'; inner.className = 'm-line-inner';
      inner.style.setProperty('--i', i);
      inner.textContent = row.join(' ');
      mask.appendChild(inner); lines.appendChild(mask);
    });
    h.textContent = '';
    h.appendChild(sr); h.appendChild(lines);
    h._rows = rows.length;
    h.setAttribute('data-split', 'ready');
  }

  function playHeadline(h){
    if(h.getAttribute('data-split') !== 'ready' || h.classList.contains('m-play')) return;
    h.classList.add('m-play');
    setTimeout(function(){
      h.innerHTML = h._original;
      h.removeAttribute('data-split');
      h.classList.remove('m-play');
    }, 100 + (h._rows - 1) * 110 + 1100 + 150);
  }

  var fontsSettled = (document.fonts && document.fonts.ready)
    ? Promise.race([document.fonts.ready, new Promise(function(r){ setTimeout(r, 1200); })])
    : Promise.resolve();
  fontsSettled.then(function(){
    headlines.forEach(function(h){
      try{ prepareHeadline(h); }
      catch(e){ if(h._original != null) h.innerHTML = h._original; h.removeAttribute('data-split'); }
      var box = h.closest('.reveal');
      if(box && box.classList.contains('is-visible')) playHeadline(h);
    });
  });

  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
        entry.target.querySelectorAll('.stat .val, .hero-stat-badge .val').forEach(countUp);
        entry.target.querySelectorAll('h1[data-split="ready"]').forEach(playHeadline);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

  introGate.then(function(){ targets.forEach(function(el){ io.observe(el); }); });
})();
