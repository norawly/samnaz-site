/* ============================================================
   Выбор языка. Подключается в <head> до отрисовки, чтобы
   посетитель не увидел мелькание чужого языка.

   Логика:
   1. Если человек уже выбирал язык руками — уважаем выбор навсегда.
   2. Иначе смотрим на часовой пояс и язык браузера. Оба признака
      берутся у самого браузера: ни одного запроса наружу, никакой
      задержки и никакой передачи данных третьим сторонам.
   3. Не поняли, где человек, — показываем русский.

   Иноязычные версии лежат отдельными страницами в /en/, /tr/ и /kk/,
   поэтому посетителю их лишние файлы не приходят вовсе.

   Казахский включается только по языку браузера: в Казахстане сайт
   по умолчанию открывается на русском, а тем, у кого в системе выбран
   казахский, сразу показываем казахскую версию.
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'snz-lang';
  var RU_ZONES = /^(Asia\/(Almaty|Aqtau|Aqtobe|Atyrau|Oral|Qostanay|Qyzylorda|Tashkent|Samarkand|Ashgabat|Dushanbe|Bishkek|Baku|Yerevan|Tbilisi|Omsk|Novosibirsk|Krasnoyarsk|Yekaterinburg|Barnaul|Tomsk)|Europe\/(Moscow|Kiev|Kyiv|Minsk|Kaliningrad|Samara|Saratov|Volgograd|Astrakhan|Ulyanovsk|Chisinau|Simferopol))/;
  var RU_LANGS = /^(ru|uk|be|uz|ky|tg|tk|az|hy|ka|mo|ab|os)/i;
  var TR_ZONES = /^(Europe\/Istanbul|Asia\/Istanbul|Europe\/Nicosia|Asia\/Nicosia|Asia\/Famagusta)$/;

  function saved() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function guess() {
    // казахский — только по явному выбору языка в системе
    var pref = navigator.languages || [navigator.language || ''];
    for (var k = 0; k < pref.length; k++) {
      if (/^kk/i.test(pref[k])) return 'kk';
      if (/^tr/i.test(pref[k])) return 'tr';
    }

    // часовой пояс — самый честный признак местоположения без запросов наружу
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (tz) {
        if (TR_ZONES.test(tz)) return 'tr';
        return RU_ZONES.test(tz) ? 'ru' : 'en';
      }
    } catch (e) {}

    // запасной признак — языки браузера
    for (var i = 0; i < pref.length; i++) {
      if (RU_LANGS.test(pref[i])) return 'ru';
    }
    if (pref[0] && /^en/i.test(pref[0])) return 'en';

    return 'ru';   // не разобрались — русский
  }

  var m = location.pathname.match(/^\/(en|tr|kk)(\/|$)/);
  var here = m ? m[1] : 'ru';
  var want = saved() || guess();

  window.SNZlang = {
    current: here,
    set: function (lang) {
      try { localStorage.setItem(KEY, lang); } catch (e) {}
    }
  };

  // клик по переключателю запоминаем — дальше автоопределение не вмешивается
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('[data-lang]');
    if (a) { try { localStorage.setItem(KEY, a.getAttribute('data-lang')); } catch (err) {} }
  }, true);

  if (want === here) return;

  // переносим человека на нужную версию той же страницы
  var path = location.pathname
    .replace(/\/index\.html$/, '/')
    .replace(/\.html$/, '')
    .replace(/^\/(en|tr|kk)/, '') || '/';
  var target = want === 'ru' ? path : '/' + want + (path === '/' ? '/' : path);

  location.replace(target + location.search + location.hash);
})();
