/* =====================================================================
   Свадебный сайт — поведение: тема, таймер, RSVP, появление секций
   ===================================================================== */
(function () {
  'use strict';

  /* ===================== НАСТРОЙКА ОТПРАВКИ RSVP =====================
     Вставьте сюда URL веб-приложения из Apps Script
     (Развернуть → Веб-приложение → «URL веб-приложения», заканчивается на /exec).
     Пока строка пустая — форма работает в демо-режиме (никуда не шлёт).
     SECRET должен совпадать с CONFIG.SECRET в apps-script.gs.            */
  var RSVP_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyuaw2Ni_w8mEcvUUlc6yBygqTK70Q_LARvCM8rYNi02MkjTibG0PX-pIl0ZD6--flm/exec';
  var RSVP_SECRET = 'ulyana-vlad-2026';
  /* ================================================================== */

  /* ----------------------- Тема (стиль) -------------------------- */
  var THEMES = ['ivanhoe', 'contrast', 'botanika'];
  function applyTheme(name, persist) {
    if (THEMES.indexOf(name) === -1) name = 'ivanhoe';
    document.documentElement.setAttribute('data-theme', name);
    if (persist) { try { localStorage.setItem('wed-theme', name); } catch (e) {} }
  }
  // приоритет: ?theme= в URL  →  localStorage  →  по умолчанию
  var urlTheme = new URLSearchParams(location.search).get('theme');
  var saved;
  try { saved = localStorage.getItem('wed-theme'); } catch (e) {}
  var initialTheme = (THEMES.indexOf(urlTheme) !== -1 ? urlTheme : (saved || 'contrast'));
  // тема из URL не сохраняется (чтобы не «залипала» для основного сайта)
  applyTheme(initialTheme, false);
  window.__initialTheme = initialTheme;
  // дать панели Tweaks сменить тему (с сохранением выбора пользователя)
  window.__setWedTheme = function (n) { applyTheme(n, true); };

  /* ----------------------- Таймер ------------------------------- */
  // Дата свадьбы: 12 сентября 2026, 15:00 (Киров, MSK)
  var TARGET = new Date('2026-09-12T15:00:00+03:00').getTime();
  var elD = document.getElementById('cd-days');
  var elH = document.getElementById('cd-hours');
  var elM = document.getElementById('cd-min');
  var elS = document.getElementById('cd-sec');

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tick() {
    if (!elD) return;
    var diff = TARGET - Date.now();
    if (diff < 0) diff = 0;
    var s = Math.floor(diff / 1000);
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600);  s -= h * 3600;
    var m = Math.floor(s / 60);    s -= m * 60;
    elD.textContent = d;
    elH.textContent = pad(h);
    elM.textContent = pad(m);
    elS.textContent = pad(s);
  }
  tick();
  setInterval(tick, 1000);

  /* ----------------------- RSVP-форма --------------------------- */
  var form = document.getElementById('rsvp-form');
  if (form) {
    var attendInputs = form.querySelectorAll('input[name="attend"]');
    var conditional = form.querySelector('#rsvp-conditional');
    var declineMsg = form.querySelector('#rsvp-decline-note');

    function syncAttend() {
      var val = (form.querySelector('input[name="attend"]:checked') || {}).value;
      if (!conditional) return;
      if (val === 'no') {
        conditional.classList.add('hidden');
        if (declineMsg) declineMsg.classList.remove('hidden');
      } else if (val === 'yes') {
        conditional.classList.remove('hidden');
        if (declineMsg) declineMsg.classList.add('hidden');
      }
    }
    attendInputs.forEach(function (i) { i.addEventListener('change', syncAttend); });

    // «Другое» → показать поле для своего пожелания
    var otherCb = form.querySelector('#alcohol-other');
    var otherTxt = form.querySelector('#alcohol-other-text');
    if (otherCb && otherTxt) {
      otherCb.addEventListener('change', function () {
        if (otherCb.checked) { otherTxt.classList.remove('hidden'); otherTxt.focus(); }
        else { otherTxt.classList.add('hidden'); otherTxt.value = ''; }
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.querySelector('input[name="guest"]');
      var attend = form.querySelector('input[name="attend"]:checked');
      if (!name.value.trim()) { name.focus(); name.style.borderColor = 'var(--rose)'; return; }
      if (!attend) {
        var firstOpt = form.querySelector('.attend-opts');
        if (firstOpt) firstOpt.animate(
          [{ transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }],
          { duration: 260 }
        );
        return;
      }

      var first = name.value.trim().split(' ')[0];
      var coming = attend.value === 'yes';
      var submitBtn = form.querySelector('button[type="submit"]');

      // Собираем данные формы
      var alcohol = [];
      form.querySelectorAll('input[name="alcohol"]:checked').forEach(function (c) { alcohol.push(c.value); });
      var payload = {
        secret: RSVP_SECRET,
        guest: name.value.trim(),
        attend: attend.value,
        companion: (form.querySelector('input[name="companion"]:checked') || {}).value || '',
        alcohol: alcohol,
        alcohol_other: (form.querySelector('#alcohol-other-text') || {}).value || '',
        transfer: (form.querySelector('input[name="transfer"]:checked') || {}).value || '',
        day2: (form.querySelector('input[name="day2"]:checked') || {}).value || ''
      };

      function showThanks() {
        var thanks = document.getElementById('rsvp-thanks');
        var thanksName = document.getElementById('rsvp-thanks-name');
        var thanksMsg = document.getElementById('rsvp-thanks-msg');
        if (thanksName) thanksName.textContent = first + ', спасибо за ответ!';
        if (thanksMsg) thanksMsg.textContent = coming
          ? 'Ответ записан. Будем вас ждать!'
          : 'Ответ записан.';
        form.classList.add('hidden');
        if (thanks) thanks.classList.remove('hidden');
        // после ответа заголовок секции больше не нужен
        var rsvpEyebrow = document.getElementById('rsvp-eyebrow');
        var rsvpTitle = document.getElementById('rsvp-title');
        if (rsvpEyebrow) rsvpEyebrow.classList.add('hidden');
        if (rsvpTitle) rsvpTitle.classList.add('hidden');
        try { localStorage.setItem('wed-rsvp', JSON.stringify({ name: payload.guest, coming: coming })); } catch (er) {}
        // якорим на блок RSVP, чтобы благодарность была в зоне видимости
        // (через rAF — после того как форма скрылась и макет пересчитался)
        var rsvp = document.getElementById('rsvp');
        if (rsvp) {
          setTimeout(function () {
            var y = rsvp.getBoundingClientRect().top + window.pageYOffset - 12;
            window.scrollTo({ top: y, behavior: 'smooth' });
          }, 40);
        }
      }

      // Показываем благодарность СРАЗУ (оптимистично), а отправку делаем в фоне
      if (RSVP_ENDPOINT) {
        fetch(RSVP_ENDPOINT, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        }).catch(function () {});
      }
      showThanks();
    });
    syncAttend();
  }

  /* ----------------------- Появление секций --------------------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (r) { io.observe(r); });
  } else {
    reveals.forEach(function (r) { r.classList.add('in'); });
  }

  /* ----------------------- Плавный скролл по якорям -------------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var t = document.querySelector(id);
      if (t) {
        e.preventDefault();
        var y = t.getBoundingClientRect().top + window.pageYOffset - 12;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    });
  });
})();
