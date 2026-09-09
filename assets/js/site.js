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

  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

  targets.forEach(function(el){ io.observe(el); });
})();
