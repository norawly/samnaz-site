/* ============================================================
   SAMNAZ ENGINEERING — site scripts v2
   Без зависимостей.
   ============================================================ */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EQ = null; // кэш каталога техники
  var LANG = (document.documentElement.lang || 'ru').slice(0, 2) === 'en' ? 'en' : 'ru';

  /* Строки, которые собираются скриптом. Всё остальное лежит в разметке. */
  var T = {
    ru: {
      swipe:     'Листайте вбок →',
      onRequest: 'Характеристики — по запросу',
      openCard:  'Открыть карточку →',
      allEquip:  'Вся техника',
      loadFail:  'Каталог не загрузился. Обновите страницу — если не помогло, напишите нам.',
      rentBlurb: 'Доступна для аренды с оператором и без. Сроки мобилизации и стоимость смены — по запросу.',
      askPrice:  'Запросить стоимость',
      specs:     'Технические характеристики',
      byRequest: 'по запросу',
      fName: 'Имя', fPhone: 'Телефон', fMail: 'E-mail', fCompany: 'Компания', fTech: 'Техника',
      leadHead: '🟡 Новая заявка с сайта', task: 'Задача:', page: 'Страница: ', time: 'Время: ',
      already: 'Заявка уже отправлена. Если нужно срочно — позвоните: +7 777 833-22-67',
      sent:    'Спасибо! Заявка отправлена — мы свяжемся с вами в ближайшее время.',
      queued:  'Спасибо! Заявка принята. Для срочной связи: +7 777 833-22-67',
      failed:  'Не удалось отправить. Позвоните нам: +7 777 833-22-67'
    },
    en: {
      swipe:     'Swipe sideways →',
      onRequest: 'Specifications on request',
      openCard:  'Open profile →',
      allEquip:  'All equipment',
      loadFail:  'The catalogue did not load. Refresh the page — if that does not help, write to us.',
      rentBlurb: 'Available for rent with or without an operator. Mobilisation times and shift rates on request.',
      askPrice:  'Request a price',
      specs:     'Technical specifications',
      byRequest: 'on request',
      fName: 'Name', fPhone: 'Phone', fMail: 'E-mail', fCompany: 'Company', fTech: 'Equipment',
      leadHead: '🟡 New request from the website', task: 'Task:', page: 'Page: ', time: 'Time: ',
      already: 'Your request has already been sent. If it is urgent, call +7 777 833-22-67',
      sent:    'Thank you. Your request has been sent — we will be in touch shortly.',
      queued:  'Thank you. Your request has been received. For urgent matters call +7 777 833-22-67',
      failed:  'Could not send. Please call us: +7 777 833-22-67'
    }
  }[LANG];


  /* ---------- 1. Заставка ---------- */
  function intro() {
    var el = $('.intro');
    if (!el) return;

    var video = $('#introVideo', el);
    var skip = $('#introSkip', el);
    var closed = false, started = false;

    var close = function () {
      if (closed) return;
      closed = true;
      el.classList.add('done');
      document.body.classList.remove('is-locked');
      if (video) { try { video.pause(); } catch (e) {} }
      setTimeout(function () { if (el.parentNode) el.remove(); }, 900);
    };

    // показываем один раз за сессию и не мучаем тех, кто просил меньше движения
    if (sessionStorage.getItem('snz-intro') || reduced || !video) { el.remove(); return; }
    sessionStorage.setItem('snz-intro', '1');
    document.body.classList.add('is-locked');

    if (skip) {
      skip.addEventListener('click', close);
      setTimeout(function () { skip.classList.add('show'); }, 1200);
    }
    video.addEventListener('ended', close);
    video.addEventListener('error', close);

    // Ждём, пока ролик прогрузится целиком, и только потом запускаем.
    // Всё это время виден первый кадр (постер) — заставка выглядит целой,
    // а не «логотип, потом вдруг анимация с начала».
    var start = function () {
      if (started || closed) return;
      started = true;
      var p = video.play();
      if (p && p.catch) p.catch(close);   // автозапуск заблокирован — просто пропускаем
    };
    video.addEventListener('canplaythrough', start, { once: true });
    // на медленной сети не ждём вечно: через 2,5 с стартуем с тем, что есть
    setTimeout(start, 2500);
    // и если даже после этого ролик не пошёл — не держим посетителя
    setTimeout(function () { if (video.paused) close(); }, 4500);
  }

  /* ---------- 2. Шапка: всегда видна, «стекло» после прокрутки ---------- */
  function header() {
    var h = $('.hdr');
    if (!h) return;
    var upd = function () { h.classList.toggle('floating', window.scrollY > 60); };
    upd();
    window.addEventListener('scroll', upd, { passive: true });
  }

  /* ---------- 3. Мобильное меню ---------- */
  function mobileNav() {
    var b = $('.burger'), m = $('.mnav');
    if (!b || !m) return;
    $$('a', m).forEach(function (a, i) { a.style.transitionDelay = (0.16 + i * 0.055) + 's'; });
    var toggle = function (open) {
      b.classList.toggle('on', open);
      m.classList.toggle('on', open);
      b.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('is-locked', open);
    };
    b.addEventListener('click', function () { toggle(!m.classList.contains('on')); });
    $$('a', m).forEach(function (a) { a.addEventListener('click', function () { toggle(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });
  }

  /* ---------- 4. Появление блоков ---------- */
  function reveal(root) {
    var items = $$('[data-rv]', root).filter(function (e) { return !e.classList.contains('in'); });
    if (!items.length) return;
    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.01, rootMargin: '0px 0px -4% 0px' });
    items.forEach(function (el) { io.observe(el); });

    // страховка: если наблюдатель почему-то не сработал (высокий блок, быстрый скролл,
    // фоновая вкладка) — показываем всё, что уже попало в окно
    var safety = function () {
      items.forEach(function (el) {
        if (el.classList.contains('in')) return;
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 1.1 && r.bottom > -80) el.classList.add('in');
      });
    };
    window.addEventListener('load', safety);
    window.addEventListener('scroll', safety, { passive: true });
    setTimeout(safety, 900);
  }

  /* ---------- 5. Одометр: цифры «выкатываются» вверх ---------- */
  function odometer() {
    var els = $$('[data-count]');
    if (!els.length) return;

    var SPINS = 2; // сколько полных оборотов «барабана» до остановки

    // строим ленту: SPINS полных проходов 0-9, затем 0..d — цифра встаёт в конце
    var build = function (el) {
      if (el.dataset.built) return;
      el.dataset.built = '1';
      var target = String(parseInt(el.dataset.count, 10));
      el.innerHTML = target.split('').map(function (ch) {
        var d = parseInt(ch, 10);
        var tape = [];
        for (var s = 0; s < SPINS; s++) for (var n = 0; n <= 9; n++) tape.push(n);
        for (var n2 = 0; n2 <= d; n2++) tape.push(n2);
        return '<span class="odo" data-len="' + tape.length + '"><i>' + tape.join('<br>') + '</i></span>';
      }).join('');
      el.dataset.target = target;
    };

    var run = function (el) {
      build(el);
      $$('.odo', el).forEach(function (odo, i) {
        var col = $('i', odo);
        var len = parseInt(odo.dataset.len, 10);   // всего кадров на ленте
        var end = -(len - 1) / len * 100;          // последний кадр = нужная цифра
        if (reduced) { col.style.transition = 'none'; col.style.transform = 'translateY(' + end + '%)'; return; }
        col.style.transitionDuration = (1.5 + i * 0.28) + 's';
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { col.style.transform = 'translateY(' + end + '%)'; });
        });
      });
    };

    els.forEach(build);

    if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (!e.isIntersecting) return;
        var box = e.target.closest('.metric');
        if (box) box.classList.add('in');
        run(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.5 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 6. Мозаика проектов ---------- */
  function mosaic() {
    var rows = $$('.mrow');
    if (!rows.length) return;
    // на телефоне мозаика превращается в горизонтальную ленту — раскрывать нечего
    if (window.matchMedia('(max-width:680px)').matches) {
      var box = $('.mosaic');
      if (box && !$('.mosaic-hint')) {
        var hint = document.createElement('div');
        hint.className = 'mosaic-hint';
        hint.textContent = T.swipe;
        box.insertAdjacentElement('afterend', hint);
      }
      return;
    }
    rows.forEach(function (row) {
      var tiles = $$('.mtile', row);
      tiles.forEach(function (t) {
        t.addEventListener('mouseenter', function () {
          row.classList.add('hot');
          tiles.forEach(function (x) { x.classList.toggle('on', x === t); });
        });
      });
      // мышь ушла из ряда — всё возвращается, полей по краям хватает, чтобы «припарковать» курсор
      row.addEventListener('mouseleave', function () {
        row.classList.remove('hot');
        tiles.forEach(function (x) { x.classList.remove('on'); });
      });
      // на тач-устройствах — тап раскрывает
      tiles.forEach(function (t) {
        t.addEventListener('click', function (ev) {
          if (window.matchMedia('(hover: hover)').matches) return;
          if (!t.classList.contains('on')) {
            ev.preventDefault();
            row.classList.add('hot');
            tiles.forEach(function (x) { x.classList.toggle('on', x === t); });
          }
        });
      });
    });
  }

  /* ---------- 7. Пошаговый процесс ---------- */
  function flow() {
    $$('.flow').forEach(function (box) {
      var btns = $$('.flow-nav button', box);
      var panes = $$('.flow-pane', box);
      var bar = $('.flow-bar i', box);
      if (!btns.length) return;
      var idx = 0, timer = null, DUR = 5200, auto = true;

      function go(i, manual) {
        idx = (i + btns.length) % btns.length;
        btns.forEach(function (b, n) { b.classList.toggle('on', n === idx); });
        panes.forEach(function (p, n) { p.classList.toggle('on', n === idx); });
        box.style.setProperty('--fp', ((idx + 1) / btns.length * 100) + '%');
        if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; }
        box.classList.remove('playing'); void box.offsetWidth;
        if (auto && !reduced) { box.style.setProperty('--dur', DUR + 'ms'); box.classList.add('playing'); }
        if (manual) { auto = false; box.classList.remove('playing'); clearInterval(timer); }
      }

      btns.forEach(function (b, i) { b.addEventListener('click', function () { go(i, true); }); });

      go(0);
      if (!reduced && 'IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (en) {
          en.forEach(function (e) {
            if (e.isIntersecting && auto) {
              clearInterval(timer);
              timer = setInterval(function () { go(idx + 1); }, DUR);
              go(idx);
            } else { clearInterval(timer); box.classList.remove('playing'); }
          });
        }, { threshold: 0.35 });
        io.observe(box);
      }
    });
  }

  /* ---------- 8. Каталог техники ---------- */
  function equipment() {
    var grid = $('#eqGrid');
    if (!grid) return;
    var limit = parseInt(grid.dataset.limit || '0', 10);

    fetch('/assets/data/equipment' + (LANG === 'en' ? '.en' : '') + '.json?v=28')
      .then(function (r) { return r.json(); })
      .then(function (list) {
        EQ = list;
        var data = limit ? list.slice(0, limit) : list;
        grid.innerHTML = data.map(function (e, i) {
          var first = e.specs && e.specs.length ? e.specs[0] : null;
          return '<button class="eq" data-i="' + list.indexOf(e) + '" data-cat="' + esc(e.type) + '" data-rv data-rv-d="' + (i % 4) + '">' +
            '<span class="eq-img"><span class="eq-badge">' + esc(e.type) + '</span>' +
              (e.img ? '<img src="' + e.img + '" alt="' + esc(e.name) + '" loading="lazy">' : '') + '</span>' +
            '<span class="eq-b">' +
              '<span class="eq-n">' + esc(e.name) + '</span>' +
              (first ? '<span class="eq-s">' + esc(first[0]) + ' · ' + esc(first[1]) + '</span>'
                     : '<span class="eq-s">' + T.onRequest + '</span>') +
              '<span class="eq-open">' + T.openCard + '</span>' +
            '</span></button>';
        }).join('');

        var fbox = $('#eqFilters');
        if (fbox) {
          var types = list.map(function (e) { return e.type; })
            .filter(function (v, i, a) { return v && a.indexOf(v) === i; }).sort();
          fbox.innerHTML = '<button class="on" data-val="*">' + T.allEquip + '</button>' +
            types.map(function (t) { return '<button data-val="' + esc(t) + '">' + esc(t) + '</button>'; }).join('');
          $$('button', fbox).forEach(function (b) {
            b.addEventListener('click', function () {
              $$('button', fbox).forEach(function (x) { x.classList.toggle('on', x === b); });
              $$('.eq', grid).forEach(function (c) {
                c.style.display = (b.dataset.val === '*' || c.dataset.cat === b.dataset.val) ? '' : 'none';
              });
            });
          });
        }

        grid.addEventListener('click', function (ev) {
          var card = ev.target.closest('.eq');
          if (!card) return;
          // телефон: раскрываем описание прямо в сетке, без полноэкранного окна
          if (window.matchMedia('(max-width:680px)').matches) {
            toggleInline(card, list[+card.dataset.i], grid);
            return;
          }
          if (!$('#shw')) { location.href = 'equipment'; return; }
          openShow(+card.dataset.i);
        });
        reveal(grid);

        // когда страница успокоится — тихо кладём крупные кадры в кэш,
        // чтобы карточка открывалась без ожидания
        var later = function () {
          if (window.requestIdleCallback) requestIdleCallback(warmAll, { timeout: 4000 });
          else setTimeout(warmAll, 1800);
        };
        if (document.readyState === 'complete') later();
        else window.addEventListener('load', later, { once: true });
      })
      .catch(function () {
        grid.innerHTML = '<p class="small">' + T.loadFail + '</p>';
      });
  }

  /* раскрытие карточки текстом — телефонная версия */
  function toggleInline(card, e, grid) {
    var open = $('.eq-more', grid);
    var mine = !!(card.nextElementSibling &&
                  card.nextElementSibling.classList.contains('eq-more'));

    // Свёрнутый блок обязательно убираем из DOM: он занимает всю ширину
    // сетки (grid-column:1/-1), и пока он висит, соседняя карточка так
    // и остаётся выброшенной на строку ниже.
    var drop = function (el) {
      if (!el) return;
      el.classList.remove('open');
      setTimeout(function () { if (el.parentNode) el.remove(); }, reduced ? 0 : 460);
    };

    $$('.eq.is-open', grid).forEach(function (c) { c.classList.remove('is-open'); });
    drop(open);
    if (mine) return;                 // повторный тап по той же карточке — просто закрыли

    var box = document.createElement('div');
    box.className = 'eq-more';
    box.innerHTML =
      '<span class="t">' + esc(e.type) + '</span>' +
      '<h4>' + esc(e.name) + '</h4>' +
      '<p>' + (e.desc ? esc(e.desc)
        : T.rentBlurb) + '</p>' +
      ((e.specs && e.specs.length)
        ? '<dl>' + e.specs.map(function (sp) {
            return '<div><dt>' + esc(sp[0]) + '</dt><dd>' + esc(sp[1]) + '</dd></div>';
          }).join('') + '</dl>'
        : '') +
      '<a class="btn btn-gold" href="#request">' + T.askPrice +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>';
    card.insertAdjacentElement('afterend', box);
    card.classList.add('is-open');
    requestAnimationFrame(function () { box.classList.add('open'); });
    setTimeout(function () {
      box.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    }, 260);
  }

  /* ---------- 9. Карточка техники ---------- */
  var showIdx = 0;
  var photoToken = 0;      // защита от гонки: пока грузилось, могли пролистать дальше
  var warmed = {};

  /* Кладём картинку в кэш браузера. Возвращает Image, чтобы можно было дождаться. */
  function warm(src) {
    if (!src) return null;
    if (warmed[src]) return warmed[src];
    var im = new Image();
    im.src = src;
    warmed[src] = im;
    return im;
  }

  /* Подставляем фото машины так, чтобы ни на кадр не мелькнула предыдущая.
     Сначала — мелкий кадр из сетки (он уже в кэше, появляется мгновенно),
     следом без рывка подменяем на крупный. */
  function setPhoto(box, e) {
    var photo = $('#shwPhoto', box);
    if (!photo) return;

    var token = ++photoToken;
    var small = e.img || '';
    var large = e.imgLg || e.img || '';

    photo.alt = e.name || '';
    photo.classList.add('is-wait');    // прячем прошлую машину, пока новая не готова

    var show = function (src) {
      if (token !== photoToken || !src) return;
      photo.src = src;
      photo.classList.remove('is-wait');
    };

    var s = warm(small);
    if (s) {
      if (s.complete && s.naturalWidth) show(small);
      else { s.addEventListener('load', function () { show(small); }, { once: true }); }
    }

    var l = warm(large);
    if (l) {
      if (l.complete && l.naturalWidth) show(large);
      else {
        l.addEventListener('load', function () { show(large); }, { once: true });
        l.addEventListener('error', function () { show(small); }, { once: true });
      }
    }

    // совсем ничего не загрузилось — не оставляем пустое место навсегда
    setTimeout(function () { if (token === photoToken) photo.classList.remove('is-wait'); }, 4000);
  }

  /* Соседние машины — чтобы листание стрелками было мгновенным */
  function warmNeighbours(i) {
    if (!EQ || !EQ.length) return;
    [i - 1, i + 1, i - 2, i + 2].forEach(function (n) {
      var e = EQ[(n + EQ.length * 2) % EQ.length];
      if (e) { warm(e.img); warm(e.imgLg); }
    });
  }

  /* Фоновый прогрев всего каталога — по одной картинке, чтобы не мешать
     остальной загрузке. На телефоне не делаем: там карточка раскрывается
     текстом в сетке и крупные кадры не нужны. */
  function warmAll() {
    if (!EQ || !EQ.length) return;
    if (window.matchMedia('(max-width:680px)').matches) return;
    var c = navigator.connection;
    if (c && (c.saveData || /^(slow-)?2g$/.test(c.effectiveType || ''))) return;

    var i = 0;
    var next = function () {
      if (i >= EQ.length) return;
      var e = EQ[i++];
      var im = warm(e && e.imgLg);
      if (!im || (im.complete && im.naturalWidth)) return setTimeout(next, 60);
      im.addEventListener('load', function () { setTimeout(next, 120); }, { once: true });
      im.addEventListener('error', function () { setTimeout(next, 120); }, { once: true });
    };
    next();
  }

  function openShow(i) {
    var box = $('#shw');
    if (!box || !EQ || !EQ.length) return;
    showIdx = (i + EQ.length) % EQ.length;
    var e = EQ[showIdx];

    // перезапуск въезда: снимаем класс, форсируем reflow, возвращаем
    var wasOpen = box.classList.contains('on');
    if (wasOpen) { box.classList.remove('on'); void box.offsetWidth; }

    setPhoto(box, e);

    $('.shw-count', box).textContent = pad(showIdx + 1) + ' / ' + pad(EQ.length);
    $('.shw-info-body', box).innerHTML =
      '<span class="shw-type">' + esc(e.type) + '</span>' +
      '<h3>' + esc(e.name) + '</h3>' +
      '<p class="shw-desc">' + (e.desc ? esc(e.desc)
        : T.rentBlurb) + '</p>' +
      '<div class="shw-spec">' + ((e.specs && e.specs.length) ? e.specs.map(function (sp, n) {
        return '<div style="--i:' + n + '"><span>' + esc(sp[0]) + '</span><span>' + esc(sp[1]) + '</span></div>';
      }).join('') : '<div style="--i:0"><span>' + T.specs + '</span><span>' + T.byRequest + '</span></div>') + '</div>';

    box.classList.add('on');
    document.body.classList.add('is-locked');
    warmNeighbours(showIdx);
  }

  function showroom() {
    var box = $('#shw');
    if (!box) return;

    var close = function () {
      box.classList.remove('on');
      document.body.classList.remove('is-locked');
    };
    $('.shw-x', box).addEventListener('click', close);
    // клик по любому месту вне окна закрывает
    box.addEventListener('click', function (e) {
      if (!e.target.closest('.shw-in')) close();
    });

    $('.shw-prev', box).addEventListener('click', function (e) { e.stopPropagation(); openShow(showIdx - 1); });
    $('.shw-next', box).addEventListener('click', function (e) { e.stopPropagation(); openShow(showIdx + 1); });

    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('on')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') openShow(showIdx - 1);
      if (e.key === 'ArrowRight') openShow(showIdx + 1);
    });
  }

  /* ---------- 10. Фильтры карточек ---------- */
  function filters() {
    $$('[data-filter-group]').forEach(function (group) {
      var btns = $$('button', group);
      var cards = $$(group.dataset.filterGroup + ' [data-cat]');
      // блок «в этой категории пока пусто» — если он есть рядом
      var empty = group.dataset.filterEmpty ? $(group.dataset.filterEmpty) : null;

      var apply = function (v) {
        var shown = 0;
        cards.forEach(function (c) {
          // data-cat может содержать несколько меток через пробел:
          // «roads done» — и дорога, и завершённый объект
          var tags = (c.dataset.cat || '').split(/\s+/);
          var on = (v === '*' || tags.indexOf(v) !== -1);
          c.style.display = on ? '' : 'none';
          if (on) shown++;
        });
        if (empty) empty.hidden = shown > 0;
        // подпись под мозаикой на пустой вкладке ни к чему
        $$(group.dataset.filterGroup + ' .mosaic-edge').forEach(function (el) {
          el.style.display = shown ? '' : 'none';
        });
        // строки мозаики без единой видимой плитки убираем, чтобы не зияли
        $$(group.dataset.filterGroup + ' .mrow').forEach(function (row) {
          var live = $$('[data-cat]', row).some(function (c) { return c.style.display !== 'none'; });
          row.style.display = live ? '' : 'none';
        });
      };

      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          btns.forEach(function (x) { x.classList.toggle('on', x === b); });
          apply(b.dataset.val);
        });
      });
    });
  }

  /* ---------- 11. Форма заявки ---------- */

  // Собираем текст заявки для Telegram
  function leadText(payload) {
    var esc = function (v) { return String(v == null ? '' : v).replace(/[<>&]/g, ''); };
    var rows = [
      [T.fName, payload.name],
      [T.fPhone, payload.phone],
      ['E-mail', payload.email],
      [T.fCompany, payload.company],
      [T.fTech, payload.tech]
    ].filter(function (r) { return r[1]; })
     .map(function (r) { return r[0] + ': ' + esc(r[1]); });

    var out = [T.leadHead, ''].concat(rows);
    if (payload.msg) out.push('', T.task, esc(payload.msg));
    out.push('', T.page + esc(payload.page));
    out.push(T.time + new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' }) + ' (Astana)');
    return out.join('\n');
  }

  // Отправка напрямую в Telegram — работает без своего сервера
  function sendDirect(payload) {
    var cfg = window.SNZ && window.SNZ.tg;
    if (!cfg || !cfg.to || !cfg.to.length) return Promise.reject(new Error('no-chat'));
    var text = leadText(payload);
    var url = 'https://api.telegram.org/bot' + cfg.k() + '/sendMessage';
    var jobs = cfg.to.map(function (chatId) {
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: text, disable_web_page_preview: true })
      }).then(function (r) { return r.json(); });
    });
    return Promise.all(jobs).then(function (res) {
      if (!res.some(function (r) { return r && r.ok; })) throw new Error('telegram');
      return true;
    });
  }

  // Отправка через обработчик — ключ остаётся на сервере
  function sendViaWorker(endpoint, payload) {
    return fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); })
      .then(function (res) { if (!res || !res.ok) throw new Error((res && res.error) || 'worker'); return true; });
  }

  function form() {
    $$('form[data-form]').forEach(function (f) {
      // приманка для спам-ботов: поле скрыто, человек его не заполнит
      if (!$('input[name="company_site"]', f)) {
        var trap = document.createElement('input');
        trap.type = 'text'; trap.name = 'company_site'; trap.tabIndex = -1;
        trap.autocomplete = 'off'; trap.setAttribute('aria-hidden', 'true');
        trap.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0';
        f.appendChild(trap);
      }

      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var ok = $('.f-ok', f);
        var btn = $('button[type="submit"]', f);

        var payload = {};
        new FormData(f).forEach(function (v, k) { payload[k] = v; });
        payload.page = location.pathname.split('/').pop() || 'index';

        if (payload.company_site) return;              // сработала приманка
        delete payload.company_site;

        var done = function (message, good) {
          if (ok) {
            ok.textContent = message;
            ok.classList.toggle('f-err', !good);
            ok.classList.add('on');
            setTimeout(function () { ok.classList.remove('on', 'f-err'); }, 7000);
          }
          if (btn) { btn.disabled = false; btn.classList.remove('is-sending'); }
          if (good) f.reset();
        };

        // не чаще одной заявки в минуту с устройства
        var last = +(localStorage.getItem('snz-lead') || 0);
        if (Date.now() - last < 60000) {
          done(T.already, false);
          return;
        }

        if (btn) { btn.disabled = true; btn.classList.add('is-sending'); }

        var endpoint = (window.SNZ && window.SNZ.FORM_ENDPOINT) || '';
        var task = endpoint ? sendViaWorker(endpoint, payload) : sendDirect(payload);

        task
          .then(function () {
            localStorage.setItem('snz-lead', String(Date.now()));
            done(T.sent, true);
          })
          .catch(function (err) {
            if (err && err.message === 'no-chat') {
              // получатель ещё не указан — заявку не теряем, показываем контакты
              done(T.queued, true);
              localStorage.setItem('snz-lead', String(Date.now()));
              return;
            }
            done(T.failed, false);
          });
      });
    });
  }

  /* ---------- 12. Прочее ---------- */
  function marquee() {
    $$('.marquee-t').forEach(function (t) {
      if (t.dataset.done) return;
      t.dataset.done = '1';
      t.innerHTML += t.innerHTML;
    });
  }
  function timeline() {
    var wrap = $('.tl');
    if (!wrap) return;
    var btns = $$('.tl-years button', wrap), items = $$('.tl-item', wrap);
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var t = document.getElementById(b.dataset.go);
        if (t) window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 120, behavior: reduced ? 'auto' : 'smooth' });
      });
    });
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (!e.isIntersecting) return;
        btns.forEach(function (b) { b.classList.toggle('on', b.dataset.go === e.target.id); });
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    items.forEach(function (i) { io.observe(i); });
  }
  /* Свечение фона едет медленнее страницы — фон чуть «дышит» при прокрутке */
  function glow() {
    var el = $('.glow');
    if (!el || reduced) return;
    var y = 0, tick = false;
    var draw = function () {
      el.style.setProperty('--glow-y', (y * 0.12).toFixed(1));
      tick = false;
    };
    window.addEventListener('scroll', function () {
      y = window.pageYOffset || 0;
      if (!tick) { tick = true; requestAnimationFrame(draw); }
    }, { passive: true });
    draw();
  }

  function chrome() {
    $$('[data-year]').forEach(function (e) { e.textContent = new Date().getFullYear(); });
    // адреса без .html, но локально файлы открываются и как about.html — учитываем оба вида
    var page = (location.pathname.split('/').pop() || '').replace(/\.html$/, '');
    $$('.nav a, .mnav a').forEach(function (a) {
      var href = (a.getAttribute('href') || '').replace(/\.html$/, '').replace(/^\//, '');
      if (href === page || (href === '' && page === 'index')) a.setAttribute('aria-current', 'page');
    });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return n < 10 ? '0' + n : String(n); }

  document.addEventListener('DOMContentLoaded', function () {
    intro(); header(); mobileNav(); reveal(); odometer(); mosaic(); flow();
    equipment(); showroom(); filters(); form(); marquee(); timeline(); chrome(); glow();
  });
})();
