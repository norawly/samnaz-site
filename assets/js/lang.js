/* ============================================================
   Выбор языка. Подключается в <head> до отрисовки, чтобы
   посетитель не увидел мелькание чужого языка.

   Логика:
   1. Если человек уже выбирал язык руками — уважаем выбор навсегда.
   2. Иначе смотрим на часовой пояс и язык браузера. Оба признака
      берутся у самого браузера: ни одного запроса наружу, никакой
      задержки и никакой передачи данных третьим сторонам.
   3. Не поняли, где человек, — показываем русский.

   Английская версия лежит отдельными страницами в /en/, поэтому
   посетителю из СНГ её файлы не приходят вовсе.
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'snz-lang';
  var RU_ZONES = /^(Asia\/(Almaty|Aqtau|Aqtobe|Atyrau|Oral|Qostanay|Qyzylorda|Tashkent|Samarkand|Ashgabat|Dushanbe|Bishkek|Baku|Yerevan|Tbilisi|Omsk|Novosibirsk|Krasnoyarsk|Yekaterinburg|Barnaul|Tomsk)|Europe\/(Moscow|Kiev|Kyiv|Minsk|Kaliningrad|Samara|Saratov|Volgograd|Astrakhan|Ulyanovsk|Chisinau|Simferopol))/;
  var RU_LANGS = /^(ru|kk|uk|be|uz|ky|tg|tk|az|hy|ka|mo|ab|os)/i;

  function saved() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function guess() {
    // часовой пояс — самый честный признак местоположения без запросов наружу
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (tz) return RU_ZONES.test(tz) ? 'ru' : 'en';
    } catch (e) {}

    // запасной признак — языки браузера
    var langs = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < langs.length; i++) {
      if (RU_LANGS.test(langs[i])) return 'ru';
    }
    if (langs[0] && /^en/i.test(langs[0])) return 'en';

    return 'ru';   // не разобрались — русский
  }

  var here = /^\/en(\/|$)/.test(location.pathname) ? 'en' : 'ru';
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
  var path = location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  var target = here === 'ru'
    ? '/en' + (path === '/' ? '/' : path)
    : path.replace(/^\/en/, '') || '/';

  location.replace(target + location.search + location.hash);
})();
