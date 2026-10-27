/* Przepisz to — wspólna nawigacja: motyw, losowanie tekstu, pasek, postęp czytania, spis treści. */
(function () {
  'use strict';
  var root = document.documentElement;
  var KLUCZ = 'przepiszto-theme';
  var skrypt = document.currentScript || document.querySelector('script[src$="assets/przepisz.js"]');
  var baza = skrypt ? skrypt.src.replace(/assets\/przepisz\.js(\?.*)?$/, '') : '';
  var ruch = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- motyw ---------- */
  function biezacyMotyw() {
    return root.getAttribute('data-theme') ||
      (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  function opiszPrzycisk(b) {
    b.setAttribute('aria-label', biezacyMotyw() === 'dark' ? 'Włącz jasny motyw' : 'Włącz ciemny motyw');
  }
  document.querySelectorAll('[data-motyw]').forEach(function (b) {
    opiszPrzycisk(b);
    b.addEventListener('click', function () {
      var nowy = biezacyMotyw() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', nowy);
      try { localStorage.setItem(KLUCZ, nowy); } catch (e) {}
      opiszPrzycisk(b);
    });
  });

  /* ---------- losuj tekst ---------- */
  var teksty = window.PRZEPISZ_TEKSTY || [];
  document.querySelectorAll('[data-losuj]').forEach(function (a) {
    if (!teksty.length) return;
    a.addEventListener('click', function (ev) {
      ev.preventDefault();
      var tu = location.pathname.replace(/\/index\.html$/, '/');
      var pula = teksty.filter(function (t) { return tu.slice(-t.u.length) !== t.u; });
      var wybor = pula[Math.floor(Math.random() * pula.length)] || teksty[0];
      location.href = baza + wybor.u;
    });
  });

  /* ---------- pasek: cień po przewinięciu, chowanie przy czytaniu ---------- */
  var pasek = document.querySelector('[data-pasek]');
  var postep = document.querySelector('[data-postep]');
  var por = document.querySelector('[data-porownanie]');
  var mqSzeroki = window.matchMedia ? matchMedia('(min-width: 1080px)') : null;
  function dwieKolumny() { return !!(por && mqSzeroki && mqSzeroki.matches); }
  var panelPastisz = por ? por.querySelector('[data-kolumna-tresc="pastisz"]') : null;
  var ostatnie = window.scrollY;
  var czeka = false;
  function odswiez() {
    czeka = false;
    var y = window.scrollY;
    if (pasek) {
      pasek.classList.toggle('przewiniety', y > 8);
      // chowamy pasek tylko na stronach tekstów i nie wtedy, gdy oba teksty są obok siebie
      if (postep && !dwieKolumny()) {
        var wDol = y > ostatnie + 4, wGore = y < ostatnie - 4;
        if (wDol && y > 240 && !pasek.contains(document.activeElement)) pasek.classList.add('schowany');
        else if (wGore || y < 240) pasek.classList.remove('schowany');
      } else {
        pasek.classList.remove('schowany');
      }
    }
    if (postep) {
      var f;
      if (dwieKolumny()) {
        var m = panelPastisz.scrollHeight - panelPastisz.clientHeight;
        f = m > 0 ? panelPastisz.scrollTop / m : 0;
      } else {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        f = max > 0 ? y / max : 0;
      }
      postep.style.transform = 'scaleX(' + Math.min(1, Math.max(0, f)) + ')';
    }
    ostatnie = y;
  }
  window.addEventListener('scroll', function () {
    if (!czeka) { czeka = true; requestAnimationFrame(odswiez); }
  }, { passive: true });
  window.addEventListener('resize', odswiez);
  if (pasek) pasek.addEventListener('focusin', function () { pasek.classList.remove('schowany'); });

  /* ---------- pastisz i oryginał obok siebie ---------- */
  if (por) (function () {
    por.classList.add('js-porownanie');
    var przelacznik = por.querySelector('[data-przelacznik]');
    var razemEtykieta = por.querySelector('[data-razem-etykieta]');
    var razem = por.querySelector('[data-razem]');
    var pasekPor = por.querySelector('.porownanie-pasek');
    var siatka = por.querySelector('.porownanie-kolumny');
    var kol = {
      pastisz: panelPastisz,
      oryginal: por.querySelector('[data-kolumna-tresc="oryginal"]')
    };
    var guziki = Array.prototype.slice.call(por.querySelectorAll('[data-kolumna]'));
    przelacznik.hidden = false;
    razemEtykieta.hidden = false;
    try { if (localStorage.getItem('przepiszto-razem') === '0') razem.checked = false; } catch (e) {}
    razem.addEventListener('change', function () {
      try { localStorage.setItem('przepiszto-razem', razem.checked ? '1' : '0'); } catch (e) {}
      if (razem.checked) przewin(kol.pastisz, kol.oryginal);
    });

    function pokaz(nazwa, fokus) {
      guziki.forEach(function (b) {
        var akt = b.getAttribute('data-kolumna') === nazwa;
        b.setAttribute('aria-selected', akt ? 'true' : 'false');
        b.tabIndex = akt ? 0 : -1;
        if (akt && fokus) b.focus();
      });
      aktualna = nazwa;
      var jedna = !dwieKolumny();
      kol.pastisz.hidden = jedna && nazwa !== 'pastisz';
      kol.oryginal.hidden = jedna && nazwa !== 'oryginal';
      odswiez();
    }
    var aktualna = 'pastisz';
    guziki.forEach(function (b, i) {
      b.addEventListener('click', function () {
        pokaz(b.getAttribute('data-kolumna'));
        var r = por.getBoundingClientRect();
        if (r.top < 0) window.scrollTo({ top: window.scrollY + r.top - 72, behavior: 'auto' });
      });
      b.addEventListener('keydown', function (ev) {
        if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
        ev.preventDefault();
        var n = guziki[(i + 1) % guziki.length];
        pokaz(n.getAttribute('data-kolumna'), true);
      });
    });
    pokaz('pastisz');

    // wysokość kolumn = to, co zostaje na ekranie pod paskiem
    function rozmiar() {
      if (!dwieKolumny()) { siatka.style.removeProperty('--wys-porownania'); return; }
      var gora = pasek ? pasek.getBoundingClientRect().height : 0;
      var wys = window.innerHeight - gora - (pasekPor ? pasekPor.offsetHeight + 12 : 0) - 14;
      siatka.style.setProperty('--wys-porownania', Math.max(420, wys) + 'px');
    }
    rozmiar();
    window.addEventListener('resize', function () { rozmiar(); pokaz(aktualna); });

    // gdy ktoś zaczyna czytać w kolumnie, dosuwamy porównanie pod pasek
    function dosun() {
      if (!dwieKolumny()) return;
      var gora = pasek ? pasek.getBoundingClientRect().height : 0;
      var r = por.getBoundingClientRect();
      if (r.top > gora + 4 && r.top < window.innerHeight) {
        window.scrollTo({ top: window.scrollY + r.top - gora - 6, behavior: ruch ? 'smooth' : 'auto' });
      }
    }

    // przewijanie proporcjonalne: obie kolumny są w tym samym miejscu opowieści
    var pomin = null;
    function przewin(zrodlo, cel) {
      if (!razem.checked || !dwieKolumny()) return;
      var m = zrodlo.scrollHeight - zrodlo.clientHeight;
      var f = m > 0 ? zrodlo.scrollTop / m : 0;
      var y = Math.round(f * (cel.scrollHeight - cel.clientHeight));
      if (Math.abs(cel.scrollTop - y) > 1) { pomin = cel; cel.scrollTop = y; }
    }
    [['pastisz', 'oryginal'], ['oryginal', 'pastisz']].forEach(function (para) {
      var a = kol[para[0]], b = kol[para[1]];
      a.addEventListener('scroll', function () {
        if (pomin === a) { pomin = null; return; }
        przewin(a, b);
        dosun();
        odswiez();
      }, { passive: true });
    });
  })();
  odswiez();

  /* ---------- spis treści na stronie głównej ---------- */
  var spis = document.querySelector('[data-spis]');
  if (!spis) return;
  spis.classList.add('js-spis');
  var sterowanie = spis.querySelector('[data-sterowanie]');
  sterowanie.hidden = false;

  var zakladki = Array.prototype.slice.call(spis.querySelectorAll('[data-zakladka]'));
  var poleSzukaj = spis.querySelector('[data-szukaj]');
  var serieBox = spis.querySelector('[data-serie]');
  var przyciskiSerii = Array.prototype.slice.call(spis.querySelectorAll('[data-serie] button'));
  var wynik = spis.querySelector('[data-wynik]');
  var pusto = spis.querySelector('[data-pusto]');
  var widok = 'utwory';
  var seria = '';

  function bezOgonkow(s) {
    s = s.toLowerCase().replace(/ł/g, 'l');
    if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return s.replace(/[„”"'’«»().,:;!?–—-]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function odmiana(n, a, b, c) {
    if (n === 1) return a;
    var d = n % 10, s = n % 100;
    return (d >= 2 && d <= 4 && (s < 12 || s > 14)) ? b : c;
  }

  function filtruj() {
    var q = bezOgonkow(poleSzukaj.value || '');
    var slowa = q ? q.split(' ') : [];
    var pasuje = function (el) {
      var t = el.getAttribute('data-tekst') || '';
      return slowa.every(function (s) { return t.indexOf(s) !== -1; });
    };
    var widoczne = 0, wszystkie = 0;
    if (widok === 'utwory') {
      spis.querySelectorAll('#utwory .seria').forEach(function (sek) {
        var ileWSerii = 0;
        var wSerii = !seria || sek.getAttribute('data-seria') === seria;
        sek.querySelectorAll('.utwor').forEach(function (li) {
          wszystkie++;
          var ok = wSerii && pasuje(li);
          li.hidden = !ok;
          if (ok) { ileWSerii++; widoczne++; }
        });
        sek.hidden = ileWSerii === 0;
      });
    } else {
      spis.querySelectorAll('#style .styl').forEach(function (li) {
        wszystkie++;
        var ok = pasuje(li);
        li.hidden = !ok;
        if (ok) widoczne++;
      });
    }
    var filtr = slowa.length || (widok === 'utwory' && seria);
    var rzecz = widok === 'utwory' ? ['utworu', 'utworów', 'utworów'] : ['stylu', 'stylów', 'stylów'];
    wynik.textContent = filtr && widoczne
      ? 'Pokazano ' + widoczne + ' z ' + wszystkie + ' ' + odmiana(wszystkie, rzecz[0], rzecz[1], rzecz[2]) + '.'
      : '';
    pusto.hidden = widoczne !== 0;
    if (!widoczne) {
      pusto.textContent = slowa.length
        ? 'Nic nie pasuje do „' + poleSzukaj.value.trim() + '”. Spróbuj nazwiska autorki lub autora albo tytułu.'
        : 'W tej serii nie ma jeszcze tekstów.';
    }
  }

  function pokazWidok(nazwa, fokus) {
    widok = nazwa;
    zakladki.forEach(function (b) {
      var akt = b.getAttribute('data-zakladka') === nazwa;
      b.setAttribute('aria-selected', akt ? 'true' : 'false');
      b.tabIndex = akt ? 0 : -1;
      document.getElementById(b.getAttribute('aria-controls')).hidden = !akt;
      if (akt && fokus) b.focus();
    });
    serieBox.hidden = nazwa !== 'utwory';
    filtruj();
  }

  zakladki.forEach(function (b, i) {
    b.addEventListener('click', function () {
      pokazWidok(b.getAttribute('data-zakladka'));
      history.replaceState(null, '', b.getAttribute('data-zakladka') === 'style' ? '#style' : '#spis');
    });
    b.addEventListener('keydown', function (ev) {
      if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
      ev.preventDefault();
      var n = zakladki[(i + (ev.key === 'ArrowRight' ? 1 : zakladki.length - 1)) % zakladki.length];
      pokazWidok(n.getAttribute('data-zakladka'), true);
    });
  });

  przyciskiSerii.forEach(function (b) {
    b.addEventListener('click', function () {
      seria = b.getAttribute('data-seria');
      przyciskiSerii.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      filtruj();
    });
  });

  poleSzukaj.addEventListener('input', filtruj);
  poleSzukaj.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { poleSzukaj.value = ''; filtruj(); }
  });

  function zHasha(przewin) {
    var h = location.hash;
    if (h === '#style') pokazWidok('style');
    else if (h === '#spis' || h === '#utwory') pokazWidok('utwory');
    else return;
    spis.scrollIntoView({ behavior: przewin && ruch ? 'smooth' : 'auto', block: 'start' });
  }
  window.addEventListener('hashchange', function () { zHasha(true); });
  // Link „Style” w pasku na stronie głównej nie zmienia hasha, gdy już jest #style — obsłuż kliknięcie.
  document.querySelectorAll('.pasek a[href$="#style"]').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      if (location.hash === '#style') { ev.preventDefault(); zHasha(true); }
    });
  });

  pokazWidok('utwory');
  zHasha(false);
})();
