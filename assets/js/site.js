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

  // Stat strip: figures count up once, the first time the strip is seen.
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

  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
        if(entry.target.classList.contains('stat-strip')){
          entry.target.querySelectorAll('.stat .val').forEach(countUp);
        }
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

  targets.forEach(function(el){ io.observe(el); });
})();
