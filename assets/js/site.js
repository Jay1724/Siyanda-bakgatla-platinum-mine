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

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduceMotion || !('IntersectionObserver' in window)) return;

  // Scroll reveal: each content block rises into place once it enters view.
  var targets = document.querySelectorAll('section, .page-head, .stat-strip, .tipoff');
  if(!targets.length) return;

  targets.forEach(function(el){ el.classList.add('reveal'); });

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

  targets.forEach(function(el){ io.observe(el); });
})();
