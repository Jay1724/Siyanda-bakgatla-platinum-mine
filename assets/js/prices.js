// Live precious-metal spot prices for the homepage strip.
// Source: gold-api.com (free, keyless). Prices are USD per troy ounce.
// If the feed is unreachable the strip stays hidden — no stale or made-up numbers.
(function(){
  'use strict';
  var strip = document.getElementById('priceStrip');
  if(!strip) return;

  var METALS = [
    { sym:'XPT', code:'Pt', name:'Platinum' },
    { sym:'XPD', code:'Pd', name:'Palladium' },
    { sym:'XAU', code:'Au', name:'Gold' },
    { sym:'XAG', code:'Ag', name:'Silver' }
  ];
  var CACHE_KEY = 'sbpm-prices', CACHE_MS = 10 * 60 * 1000;

  function readCache(){
    try{
      var c = JSON.parse(sessionStorage.getItem(CACHE_KEY));
      if(c && Date.now() - c.t < CACHE_MS) return c.d;
    }catch(e){}
    return null;
  }
  function writeCache(d){
    try{ sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t:Date.now(), d:d })); }catch(e){}
  }

  function fetchMetal(m){
    return fetch('https://api.gold-api.com/price/' + m.sym)
      .then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); })
      .then(function(j){
        var price = Number(j.price);
        if(!isFinite(price) || price <= 0) throw new Error('bad price');
        return { sym:m.sym, price:price, updatedAt:j.updatedAt || null };
      });
  }

  function render(rows){
    var fmt = new Intl.NumberFormat('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
    METALS.forEach(function(m){
      var row = rows.filter(function(r){ return r.sym === m.sym; })[0];
      var el = strip.querySelector('[data-sym="' + m.sym + '"] .price-val');
      if(!el) return;
      if(row){ el.textContent = '$' + fmt.format(row.price); }
      else{ el.textContent = 'n/a'; }
    });
    var stamps = rows.map(function(r){ return Date.parse(r.updatedAt); }).filter(isFinite);
    var note = strip.querySelector('.price-time');
    if(note && stamps.length){
      var d = new Date(Math.max.apply(null, stamps));
      note.textContent = 'Updated ' + d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    }
    strip.hidden = false;
  }

  var cached = readCache();
  if(cached){ render(cached); return; }

  Promise.all(METALS.map(function(m){ return fetchMetal(m).catch(function(){ return null; }); }))
    .then(function(rows){
      rows = rows.filter(Boolean);
      if(!rows.length) return; // feed down: leave strip hidden
      writeCache(rows);
      render(rows);
    });
})();
