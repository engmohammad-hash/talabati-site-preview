/* ============================================================================
   طلباتي — سلوك الموقع
   ----------------------------------------------------------------------------
   لا توجد أي إعدادات هنا. كل ما هو قابل للتغيير موجود في config.js في جذر الموقع.

   المحتوى:
     ١) الوضع الليلي/النهاري      ٦) الوهج الذهبي في البطاقات
     ٢) قائمة الهمبرجر            ٧) ربط الإعدادات (التنزيل، واتساب، …)
     ٣) الهيدر، والتقدّم، والعودة للأعلى  ٨) معرض لقطات التطبيق
     ٤) الظهور عند التمرير         ٩) شاشة البداية
     ٥) كشف العنوان كلمةً كلمة     ١٠) انميشن التنزيل
   ========================================================================== */
(function () {
  'use strict';

  var CFG    = window.TALABATI || {};
  var LANG   = document.documentElement.lang === 'en' ? 'en' : 'ar';
  var AR     = LANG === 'ar';
  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ========================================================================
     ١) الوضع الليلي
     التخزين قد يفشل (تصفّح خاص، منع الكوكيز، فتح الملف مباشرةً من القرص)،
     فكل قراءة وكتابة محميّة ولا تُعطّل شيئًا عند فشلها.
     ==================================================================== */
  function readStore(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function writeStore(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* لا شيء */ } }

  function applyTheme(mode) {
    document.documentElement.setAttribute('data-theme', mode);
    /* في الصفحة وسما theme-color مربوطان بتفضيل النظام، ليعمل اللون حتى بلا
       جافاسكربت. وحين يختار الزائر وضعًا بنفسه نُزيل عنهما قيد الوسائط ليغلب
       اختياره على تفضيل النظام. */
    var color = mode === 'dark' ? '#070D09' : '#F6F5EF';
    $$('meta[name="theme-color"]').forEach(function (m) {
      m.removeAttribute('media');
      m.setAttribute('content', color);
    });
    $$('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-label', mode === 'dark'
        ? (AR ? 'التبديل إلى الوضع النهاري' : 'Switch to light mode')
        : (AR ? 'التبديل إلى الوضع الليلي' : 'Switch to dark mode'));
    });
  }

  applyTheme(readStore('talabati-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

  $$('[data-theme-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      writeStore('talabati-theme', next);
    });
  });

  /* ========================================================================
     ٢) قائمة الهمبرجر
     لوح جانبيّ متاح في كل القياسات. يُغلق بالضغط على الخلفية، أو على أيّ رابط
     داخله، أو بمفتاح الهروب. وحين يكون مفتوحًا تُمنع الصفحة خلفه من التمرير.
     ==================================================================== */
  var root    = document.documentElement;
  var menuBtn = $('[data-menu]');
  var drawer  = $('#drawer');
  var lastFocus = null;

  function setMenu(open) {
    if (!drawer) return;
    if (open === drawer.classList.contains('is-on')) return;
    drawer.classList.toggle('is-on', open);
    $$('.scrim').forEach(function (s) { s.classList.toggle('is-on', open); });
    root.classList.toggle('is-locked', open);
    if (menuBtn) menuBtn.setAttribute('aria-expanded', String(open));
    if (open) {
      lastFocus = document.activeElement;
      var first = $('a, button', drawer);
      if (first) first.focus();
    } else if (lastFocus && lastFocus.focus) {
      lastFocus.focus();
      lastFocus = null;
    }
  }

  if (menuBtn && drawer) {
    menuBtn.addEventListener('click', function () {
      setMenu(!drawer.classList.contains('is-on'));
    });
    $$('[data-menu-close]').forEach(function (el) {
      el.addEventListener('click', function () { setMenu(false); });
    });
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
  }

  /* ========================================================================
     ٣) الهيدر، شريط التقدّم، والبارالاكس — كلّها في حلقة تمرير واحدة
     ==================================================================== */
  var header    = $('.site-header');
  var bar       = $('#progress');
  var parallax  = $$('[data-parallax]');
  var ticking   = false;

  /* العناصر التي ما زالت مخفيّة، تُحذف من القائمة حال ظهورها.
     نفحصها داخل حلقة التمرير بدل IntersectionObserver، لأن المراقب قد لا يرصد
     عنصرًا عبَرَته الصفحة بين إطارين (عند ضغط رابط في القائمة أو زرّ End)،
     فيبقى ذلك العنصر مخفيًّا إلى الأبد. */
  var pending = REDUCE ? [] : $$('[data-reveal]').concat($$('[data-split]'));

  /* يقرأ وحسب: يُعيد العناصر التي حان ظهورها، ويشطبها من قائمة الانتظار.
     إضافة الأصناف تتم لاحقًا مع بقيّة الكتابات. */
  function readPending(vh) {
    var out = null;
    for (var i = pending.length - 1; i >= 0; i--) {
      var el = pending[i];
      // يظهر متى بلغ أعلاه ٩٠٪ من ارتفاع الشاشة، أو كان قد صعد فوقها أصلًا
      if (el.getBoundingClientRect().top < vh * 0.9) {
        (out || (out = [])).push(el);
        pending.splice(i, 1);
      }
    }
    return out;
  }

  /* روابط القائمتين — الهيدر والقائمة الجانبية — مجموعةً حسب القسم الذي تشير
     إليه، فالقسم الواحد يُضيء رابطيه معًا. */
  var spy = [];
  (function () {
    var byId = {};
    $$('.nav a[href*="#"], .drawer-nav a[href*="#"]').forEach(function (a) {
      var id = a.getAttribute('href').split('#')[1];
      var section = id && document.getElementById(id);
      if (!section) return;
      if (!byId[id]) { byId[id] = { links: [], section: section }; spy.push(byId[id]); }
      byId[id].links.push(a);
    });
  })();
  var spyCurrent = null;

  function updateSpy(vh) {
    var best = null;
    for (var i = 0; i < spy.length; i++) {
      var top = spy[i].section.getBoundingClientRect().top;
      if (top <= vh * 0.35) best = spy[i];      // آخر قسم تجاوز ثلث الشاشة
    }
    if (best === spyCurrent) return;
    if (spyCurrent) spyCurrent.links.forEach(function (a) { a.removeAttribute('aria-current'); });
    if (best) best.links.forEach(function (a) { a.setAttribute('aria-current', 'true'); });
    spyCurrent = best;
  }

  /* زرّ العودة إلى الأعلى: يظهر بعد أن يمرّ الزائر شاشةً كاملة */
  var topBtn = $('[data-top]');
  function toTop() {
    window.scrollTo({ top: 0, behavior: REDUCE ? 'auto' : 'smooth' });
  }
  if (topBtn) topBtn.addEventListener('click', toTop);

  /* الشعار: يعيدك إلى أعلى الصفحة نفسها بلا إعادة تحميل.
     الرابط يبقى في المصدر كما هو، فمن لا تعمل عنده الجافاسكربت يُعاد تحميل
     الصفحة كالعادة. */
  $$('[data-home]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;   // فتح في تبويب جديد
      e.preventDefault();
      setMenu(false);
      toTop();
      if (location.hash) {
        try { history.replaceState(null, '', location.pathname + location.search); } catch (err) { /* لا شيء */ }
      }
    });
  });

  /* قراءةٌ أوّلًا ثم كتابة.
     كل قراءة لموضع عنصر بعد كتابةٍ على الصفحة تُجبر المتصفّح على إعادة حساب
     التخطيط كلّه في منتصف الإطار. بترتيب القراءات معًا ثم الكتابات معًا يصير
     في الإطار حسابٌ واحد بدل عدّة حسابات، وهذا وحده يفرق في سلاسة التمرير. */
  function onScroll() {
    var y  = window.scrollY || window.pageYOffset;
    var vh = window.innerHeight;
    var i;

    // --- قراءات ---
    var max = bar ? document.documentElement.scrollHeight - vh : 0;
    if (spy.length) updateSpy(vh);
    var ready = pending.length ? readPending(vh) : null;

    var moves = null;
    if (!REDUCE && parallax.length) {
      moves = [];
      for (i = 0; i < parallax.length; i++) {
        var el = parallax[i];
        var rect = el.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) continue;   // خارج الشاشة
        var speed = parseFloat(el.dataset.parallax) || 0.15;
        // المسافة بين مركز العنصر ومركز الشاشة، مضروبة بالسرعة
        moves.push([el, (rect.top + rect.height / 2 - vh / 2) * -speed]);
      }
    }

    // --- كتابات ---
    if (header) header.classList.toggle('solid', y > 24);
    if (topBtn) topBtn.classList.toggle('is-on', y > vh * 0.8);
    if (bar) bar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    if (ready) {
      for (i = 0; i < ready.length; i++) {
        ready[i].classList.add(ready[i].hasAttribute('data-split') ? 'is-lit' : 'is-in');
      }
    }
    if (moves) {
      for (i = 0; i < moves.length; i++) {
        moves[i][0].style.transform = 'translate3d(0,' + moves[i][1].toFixed(1) + 'px,0)';
      }
    }
    ticking = false;
  }

  /* نُجدول حسابًا واحدًا لكل إطار. المتصفّح يُجمّد requestAnimationFrame في
     الصفحات المخفيّة، فلو اعتمدنا عليه وحده لبقي ticking مرفوعًا إلى الأبد بعد
     أوّل تمرير، ولتوقّف كل شيء حتى بعد عودة الصفحة. لذلك نستعمل مؤقّتًا حين
     تكون الصفحة مخفيّة. */
  function schedule() {
    if (ticking) return;
    ticking = true;
    if (document.hidden) setTimeout(onScroll, 0);
    else window.requestAnimationFrame(onScroll);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  /* أوّل استدعاء مؤجَّل إلى نهاية الملف، بعد تقسيم العنوان إلى كلمات. */

  /* ========================================================================
     ٤) الظهور عند التمرير
     عند تعطيل الحركة يظهر كل شيء فورًا؛ وإلّا تتكفّل حلقة onScroll أعلاه.
     ==================================================================== */
  if (REDUCE) {
    $$('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
    $$('[data-split]').forEach(function (el) { el.classList.add('is-lit'); });
  }

  /* ========================================================================
     ٥) كشف العنوان كلمةً كلمة
     كل كلمة تُلَفّ بعنصرين: الخارجي يقصّ، والداخلي ينزلق إلى أعلى.
     ==================================================================== */
  if (!REDUCE) {
    $$('[data-split]').forEach(function (el) {
      var words = el.textContent.trim().split(/\s+/);
      el.textContent = '';
      words.forEach(function (w, i) {
        var outer = document.createElement('span');
        outer.className = 'split-word';
        var inner = document.createElement('span');
        inner.textContent = w;
        inner.style.setProperty('--w-delay', (i * 0.07) + 's');
        outer.appendChild(inner);
        el.appendChild(outer);
        if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      });
    });
  }

  /* ========================================================================
     ٦) وهج ذهبي يتبع المؤشّر داخل بطاقات المميّزات
     ==================================================================== */
  if (!REDUCE && window.matchMedia('(hover: hover)').matches) {
    $$('.feature').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });

    /* إطار الموبايل في قسم «هكذا يبدو التطبيق» يميل قليلًا مع المؤشّر.
       زاوية صغيرة عن قصد: ما يزيد عنها يصير لعبة لا عرضًا. */
    $$('.showcase .phone-stage').forEach(function (stage) {
      var phone = $('.phone', stage);
      if (!phone) return;
      stage.addEventListener('pointermove', function (e) {
        var r = stage.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width  - 0.5;
        var py = (e.clientY - r.top)  / r.height - 0.5;
        phone.style.setProperty('--tilt-y', (px *  10).toFixed(2) + 'deg');
        phone.style.setProperty('--tilt-x', (py * -10).toFixed(2) + 'deg');
      });
      stage.addEventListener('pointerleave', function () {
        phone.style.setProperty('--tilt-y', '0deg');
        phone.style.setProperty('--tilt-x', '0deg');
      });
    });

    /* الزرّ الذهبيّ ينجذب نحو المؤشّر بضعة بكسلات — يُحسّ ولا يكاد يُرى. */
    $$('.btn-gold').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        btn.style.setProperty('--pull-x', ((e.clientX - r.left - r.width  / 2) * 0.12).toFixed(1) + 'px');
        btn.style.setProperty('--pull-y', ((e.clientY - r.top  - r.height / 2) * 0.16).toFixed(1) + 'px');
      });
      btn.addEventListener('pointerleave', function () {
        btn.style.setProperty('--pull-x', '0px');
        btn.style.setProperty('--pull-y', '0px');
      });
    });
  }

  /* ========================================================================
     ٧) ربط الإعدادات من config.js بعناصر الصفحة
     ==================================================================== */

  /* يحوّل رابطًا نسبيًّا من config.js إلى رابط كامل محسوب من جذر الموقع، لا من
     الصفحة الحالية. فـ "downloads/talabati.apk" يصل إلى الملف نفسه من الصفحة
     العربية ومن en/ ومن 404.html، وبالضغط المزدوج على القرص كما على الدومين.
     الجذر هو المجلّد الذي حُمِّل منه config.js نفسه. */
  function fromSiteRoot(path) {
    if (!path) return '';
    var cfg = $('script[src$="config.js"]');
    try { return new URL(path, cfg ? cfg.src : document.baseURI).href; }
    catch (e) { return path; }
  }

  /* رابط تنزيل التطبيق — إن كان فارغًا تتحوّل الأزرار تلقائيًّا إلى «قريبًا» */
  (function () {
    var url = fromSiteRoot((CFG.apkUrl || '').trim());
    $$('[data-apk]').forEach(function (a) {
      var label = $('.btn-label', a) || a;
      if (url) {
        a.href = url;
        a.setAttribute('download', '');
        a.removeAttribute('aria-disabled');
        /* الضغط يبدأ التنزيل من المتصفّح مباشرةً؛ نرافقه بانميشن فوق الصفحة */
        a.addEventListener('click', function () { openDl(); });
      } else {
        a.href = '#download';
        a.setAttribute('aria-disabled', 'true');
        label.textContent = AR ? 'قريبًا جدًّا' : 'Coming very soon';
      }
    });

    $$('[data-apk-note]').forEach(function (n) {
      if (url) {
        n.textContent = AR
          ? 'أندرويد • الإصدار ' + (CFG.apkVersion || '') + (CFG.apkSizeMB ? ' • ' + CFG.apkSizeMB + ' م.ب' : '')
          : 'Android • v' + (CFG.apkVersion || '') + (CFG.apkSizeMB ? ' • ' + CFG.apkSizeMB + ' MB' : '');
      } else {
        n.innerHTML = AR
          ? 'التطبيق في مراحله الأخيرة — <strong>تابِعنا ليصلك أوّل إشعار</strong>'
          : 'The app is in final testing — <strong>follow us to hear first</strong>';
      }
    });

    var play = (CFG.playStoreUrl || '').trim();
    $$('[data-play]').forEach(function (a) {
      if (play) { a.href = play; a.hidden = false; } else { a.remove(); }
    });
  })();

  /* ========================================================================
     الآيفون
     ما دام التطبيق ليس في App Store، نسخة الآيفون هي تطبيق الويب في app/:
     يُفتح في Safari ويُضاف إلى الشاشة الرئيسية. زرّ الآيفون يفتح لوحًا يشرح
     ذلك في ثلاث خطوات. وحين يُكتب رابط App Store في config.js يصير الزرّ
     رابطًا مباشرًا إلى المتجر ويختفي اللوح.
     ==================================================================== */
  var UA = navigator.userAgent || '';
  var IS_IOS = /iPad|iPhone|iPod/.test(UA) ||
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);   // iPadOS
  var IS_ANDROID = /Android/i.test(UA);
  root.classList.add(IS_IOS ? 'is-ios' : IS_ANDROID ? 'is-android' : 'is-desktop');

  var sheet = $('#ios-sheet');
  var sheetFocus = null;

  function setSheet(open) {
    if (!sheet || open === sheet.classList.contains('is-on')) return;
    sheet.classList.toggle('is-on', open);
    root.classList.toggle('is-locked', open);
    if (open) {
      sheetFocus = document.activeElement;
      var first = $('[data-ios-open]', sheet);
      if (first) first.focus();
    } else if (sheetFocus && sheetFocus.focus) {
      sheetFocus.focus();
      sheetFocus = null;
    }
  }

  (function () {
    var store = (CFG.appStoreUrl || '').trim();
    var web = fromSiteRoot((CFG.iosWebAppUrl || 'app/').trim());

    $$('[data-ios-open]').forEach(function (a) { a.href = web; });

    $$('[data-ios]').forEach(function (a) {
      if (store) {
        a.href = store;
        a.target = '_blank';
        a.rel = 'noopener';
        return;
      }
      a.href = web;
      a.addEventListener('click', function (e) {
        if (!sheet || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
        e.preventDefault();
        setMenu(false);
        setSheet(true);
      });
    });

    if (sheet) {
      $$('[data-ios-close]', sheet).forEach(function (b) {
        b.addEventListener('click', function () { setSheet(false); });
      });
      // الضغط على الخلفية المعتمة خارج البطاقة يغلق اللوح
      sheet.addEventListener('click', function (e) { if (e.target === sheet) setSheet(false); });
    }

    /* على الآيفون يتقدّم زرّ الآيفون على زرّ الأندرويد — كلّ زائر يرى زرّ
       جهازه أوّلًا. الزرّان ذهبيّان في الحالتين، فلا شيء هنا يبدّل الألوان:
       كان يقلب زرّ الأندرويد إلى رماديّ، وهذا يفسده بعد أن صارا سواء. */
    if (IS_IOS) {
      $$('[data-ios]').forEach(function (ios) {
        var apk = ios.parentNode && $('[data-apk]', ios.parentNode);
        if (!apk || apk.parentNode !== ios.parentNode) return;
        ios.parentNode.insertBefore(ios, apk);
      });
      $$('[data-apk-note]').forEach(function (n) {
        n.textContent = AR ? 'آيفون • يعمل من Safari ويُضاف إلى شاشتك الرئيسية'
                           : 'iPhone • runs in Safari and sits on your Home Screen';
      });
    }
  })();

  /* رقم واتساب مُهيّأً للرابط، ومعه نصّ الرسالة الأولى */
  var waUrl = (function () {
    var n = (CFG.whatsapp || '').replace(/[^\d]/g, '');
    if (!n) return '';
    return 'https://wa.me/' + n + '?text=' + encodeURIComponent(AR
      ? 'مرحبًا، أودّ الاستفسار عن تطبيق طلباتي'
      : 'Hello, I have a question about Talabati');
  })();

  /* واتساب: الزرّ العائم وأزرار الصفحة. بلا رقم في config.js تُحذف كلّها. */
  $$('[data-wa]').forEach(function (a) {
    if (waUrl) { a.href = waUrl; } else { a.remove(); }
  });

  /* «انضمّ كتاجر»: الرقم نفسه، برسالة أولى تقول ما يريده التاجر. */
  (function () {
    var n = (CFG.whatsapp || '').replace(/[^\d]/g, '');
    $$('[data-wa-merchant]').forEach(function (a) {
      if (!n) { a.remove(); return; }
      a.href = 'https://wa.me/' + n + '?text=' + encodeURIComponent(AR
        ? 'مرحبًا، أودّ إضافة متجري إلى تطبيق طلباتي'
        : 'Hello, I would like to add my store to Talabati');
    });
  })();

  /* سطر الاعتماد «sadeem soft» يذهب إلى رقم المكتب، لا إلى رقم طلباتي. */
  (function () {
    var n = (CFG.creditWhatsapp || '').replace(/[^\d]/g, '');
    $$('[data-wa-credit]').forEach(function (a) {
      if (n) {
        a.href = 'https://wa.me/' + n + '?text=' + encodeURIComponent(AR
          ? 'مرحبًا، وصلت إليكم من موقع طلباتي'
          : 'Hello, I found you through the Talabati website');
      } else if (waUrl) {
        a.href = waUrl;
      } else {
        a.removeAttribute('href');
      }
    });
  })();

  /* البريد النصّي داخل القوائم — لا يظهر حتى تضعه في config.js */
  (function () {
    var m = (CFG.email || '').trim();
    $$('[data-email]').forEach(function (a) {
      if (m) { a.href = 'mailto:' + m; a.textContent = m; }
      else { var li = a.closest('li'); (li || a).remove(); }
    });
  })();

  /* أيقونات التواصل: واتساب وفيسبوك وإنستغرام والبريد.
     الأيقونة التي لم يصلها رابطها بعد تبقى في مكانها بلا نقرة، فلا ينهار صفّ
     الأيقونات ولا يَعِد الموقع بصفحة غير موجودة. */
  (function () {
    var s = CFG.social || {};
    var mail = (CFG.email || '').trim();
    $$('[data-social]').forEach(function (a) {
      var key = a.dataset.social;
      var url = key === 'whatsapp' ? waUrl
              : key === 'email'    ? (mail ? 'mailto:' + mail : '')
              : (s[key] || '').trim();
      if (url) {
        a.href = url;
        a.removeAttribute('aria-disabled');
        if (key === 'email') a.title = mail;
      } else {
        a.removeAttribute('href');
        a.setAttribute('aria-disabled', 'true');
        a.title = AR ? 'قريبًا' : 'Coming soon';
      }
    });
  })();

  /* ========================================================================
     ٩) شاشة البداية
     تُخفى عند اكتمال تحميل الصفحة، بحدّ أدنى كي لا تومض وحدّ أقصى كي لا تعلق
     إن تأخّر ملفّ ما.
     ==================================================================== */
  (function () {
    var boot = $('#boot');
    var t0 = Date.now();
    var done = false;

    function finish() {
      if (done) return;
      done = true;
      root.classList.remove('is-booting');
      if (!boot) return;
      boot.classList.add('is-gone');
      // الدرّاجة تنطلق ثمّ يذوب الحجاب (٠٫٣٤ث + ٠٫٥٥ث في CSS)
      setTimeout(function () { if (boot.parentNode) boot.parentNode.removeChild(boot); }, 1000);
    }

    if (!boot) { finish(); return; }

    /* أوّل مرّة في الجلسة يرى الزائر الدرّاجة تمضي قليلًا قبل أن تنطلق؛
       بعدها، عند التنقّل بين العربية والإنجليزية، تمرّ سريعًا. */
    var first = true;
    try {
      first = !sessionStorage.getItem('talabati-boot');
      sessionStorage.setItem('talabati-boot', '1');
    } catch (e) { /* لا شيء */ }
    var min = REDUCE ? 0 : (first ? 1700 : 700);
    function afterLoad() {
      setTimeout(finish, Math.max(0, min - (Date.now() - t0)));
    }
    if (document.readyState === 'complete') afterLoad();
    else window.addEventListener('load', afterLoad);
    /* شبكة أمان: على شبكة بطيئة قد يتأخّر حدث التحميل كثيرًا، والصفحة خلف
       الشاشة لا تُمرَّر. بعد ثلاث ثوانٍ نرفع الغطاء ونترك بقيّة الصور
       تصل وهي مرئيّة. */
    setTimeout(finish, 3000);
  })();

  /* ========================================================================
     ١٠) انميشن التنزيل
     التنزيل نفسه يبدأ من المتصفّح فور الضغط؛ هذه طبقة فوق الصفحة لا تؤخّره،
     وتُغلق بالضغط أو بمفتاح الهروب أو بعد ثوانٍ.
     ==================================================================== */
  var dl = $('#dl');
  var dlTimers = [];

  function closeDl() {
    if (!dl) return;
    dlTimers.forEach(clearTimeout);
    dlTimers = [];
    dl.classList.remove('is-on');
    root.classList.remove('is-locked');
  }

  function openDl() {
    if (!dl) return;
    dlTimers.forEach(clearTimeout);
    dlTimers = [];
    var title = $('[data-dl-title]', dl);
    var sub   = $('[data-dl-sub]', dl);
    if (title) title.textContent = AR ? 'جارٍ تجهيز التنزيل…' : 'Preparing your download…';
    if (sub)   sub.textContent   = AR ? 'ملفّ واحد للأندرويد، ولا يحتاج حسابًا ولا بطاقة.'
                                      : 'One Android file. No account, no card.';
    dl.classList.remove('is-done');
    dl.classList.add('is-on');
    root.classList.add('is-locked');

    dlTimers.push(setTimeout(function () {
      dl.classList.add('is-done');
      if (title) title.textContent = AR ? 'بدأ التنزيل' : 'Download started';
      if (sub)   sub.textContent   = AR ? 'حين ينتهي التنزيل، ثلاث خطوات وتصير جاهزًا:'
                                        : 'When it finishes, three steps and you are in:';
    }, REDUCE ? 0 : 1500));
    dlTimers.push(setTimeout(closeDl, REDUCE ? 6000 : 7500));
  }

  if (dl) dl.addEventListener('click', closeDl);

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.key !== 'Esc') return;
    setMenu(false);
    setSheet(false);
    closeDl();
  });

  /* ========================================================================
     ٨) معرض لقطات التطبيق
     الصور تُحمَّل من مجلّد screenshots/ حسب الأسماء في config.js.
     الملف المفقود يُتجاهَل بهدوء، وإن لم توجد أي لقطة تبقى الواجهة المرسومة.
     ==================================================================== */
  (function () {
    // هاتفان يعرضان اللقطات: هاتف الواجهة بنقاطه وتعليقه، وهاتف قسم
    // «هكذا يبدو التطبيق» بجانب القائمة. لكلٍّ منهما صوره وأزراره — كانت
    // القائمة تحرّك هاتف الواجهة في أعلى الصفحة بينما يبقى الهاتف المجاور
    // لها رسمًا. الصورة نفسها تُحمَّل مرّة واحدة ويعيد المتصفّح استعمالها.
    /* هاتف الواجهة يُحمّل صوره فورًا لأنه أوّل ما يُرى. وهاتف قسم «هكذا يبدو
       التطبيق» يؤجّلها حتى يقترب منه الزائر: الصور نفسها في هاتفين، وتحميلها
       مرّتين دفعةً واحدة يملأ الذاكرة بلا داعٍ ويُبطئ أوّل رسم. */
    var appShots = (CFG.screenshots || []).slice();
    gallery($('#shots'),          appShots, { caption: $('#shot-caption'), dots: $('#shot-dots'), eager: true });
    gallery($('#shots-showcase'), appShots, { list: $('#shot-list') });
    /* هاتف قسم «للتجّار»: لقطات حساب التاجر، بنقاطها وتعليقها. */
    gallery($('#shots-merchant'), (CFG.merchantShots || []).slice(),
            { caption: $('#merchant-caption'), dots: $('#merchant-dots') });

    function gallery(stage, shots, parts) {
    if (!stage || !shots.length) return;
    var screen  = $('.phone-screen', stage);
    var caption = parts.caption;
    var list    = parts.list;
    var dots    = parts.dots;
    if (!screen) return;

    var ready = [], imgs = [], pending = shots.length;
    var idx = 0, timer = null, built = false;
    var loaded = [];                             // بترتيب config.js لا بترتيب وصول الصور

    /* هاتف الواجهة يحمّل فورًا لأنه أوّل ما يُرى. الهواتف الأخرى تنتظر حتى
       يقترب منها الزائر ثمّ تحمّل صورها دفعةً واحدة. كانت «كسولة» بيد
       المتصفّح، فبقي هاتف قسم التجّار رسمًا: الصورة المخفيّة بالشفافية قد
       لا يطلبها المتصفّح أبدًا. */
    function load() {
      shots.forEach(function (s, i) {
        var img = new Image();
        img.alt = s[LANG] || '';
        img.fetchPriority = parts.eager && i === 0 ? 'high' : 'low';
        img.decoding = 'async';
        img.onload  = function () { loaded[i] = { s: s, img: img }; build(); };
        img.onerror = function () { img.remove(); build(); };
        img.src = (stage.dataset.base || '') + s.file;
        // مخفيّة بـ CSS حتى تصير is-live، فلا يُرى شيء قبل أوانه.
        screen.appendChild(img);
      });
    }

    if (parts.eager || !('IntersectionObserver' in window)) {
      load();
    } else {
      var io = new IntersectionObserver(function (entries) {
        if (!entries.some(function (e) { return e.isIntersecting; })) return;
        io.disconnect();
        load();
      }, { rootMargin: '600px 0px' });
      io.observe(stage);
    }

    function build() {
      if (--pending > 0 || built) return;
      built = true;
      loaded.forEach(function (x) {
        if (!x) return;
        ready.push(x.s); imgs.push(x.img);
      });
      if (!ready.length) return;                 // لا لقطات ← تبقى الواجهة المرسومة

      var mock = $('.mock', screen);
      if (mock) mock.remove();

      if (list) {
        list.innerHTML = '';
        ready.forEach(function (s, i) {
          var li = document.createElement('li');
          var b = document.createElement('button');
          b.type = 'button';
          b.innerHTML = '<span class="dot"></span><span>' + (s[LANG] || '') + '</span>';
          b.addEventListener('click', function () { show(i, true); });
          li.appendChild(b);
          list.appendChild(li);
        });
      }
      if (dots) {
        dots.innerHTML = '';
        ready.forEach(function (s, i) {
          var b = document.createElement('button');
          b.type = 'button';
          b.setAttribute('aria-label', (AR ? 'لقطة ' : 'Screenshot ') + (i + 1));
          b.addEventListener('click', function () { show(i, true); });
          dots.appendChild(b);
        });
      }
      show(0, false);
      if (!REDUCE && ready.length > 1) timer = setInterval(next, 4200);
    }

    function show(i, stop) {
      idx = (i + ready.length) % ready.length;
      imgs.forEach(function (im, n) { im.classList.toggle('is-live', n === idx); });
      if (caption) caption.textContent = ready[idx][LANG] || '';
      if (list) $$('button', list).forEach(function (b, n) { b.setAttribute('aria-current', String(n === idx)); });
      if (dots) $$('button', dots).forEach(function (b, n) { b.setAttribute('aria-current', String(n === idx)); });
      if (stop && timer) { clearInterval(timer); timer = null; }
    }
    function next() { show(idx + 1, false); }
    }
  })();

  /* أزرار تبويب تتنقّل بالأسهم، كما يتوقّع قارئ الشاشة ومستعمل لوحة المفاتيح.
     في العربية السهم الأيسر هو «التالي»، لأن الصفّ يبدأ من اليمين. */
  function tabKeys(tabs, choose) {
    tabs.forEach(function (t, i) {
      t.addEventListener('keydown', function (e) {
        var step = e.key === 'ArrowLeft' ? (AR ? 1 : -1) : e.key === 'ArrowRight' ? (AR ? -1 : 1) : 0;
        if (!step) return;
        e.preventDefault();
        var live = tabs.filter(function (x) { return !x.hidden; });
        var next = live[(live.indexOf(t) + step + live.length) % live.length];
        if (next) { choose(next); next.focus(); }
      });
    });
  }

  /* ========================================================================
     ١١) الفيديوهات التعليمية
     مجموعتان في config.js: طريقة الطلب وطريقة التثبيت. القائمة تُبنى من
     هناك، ولا يُحمَّل أيّ مقطع قبل أن يضغطه الزائر — الفيديو بلا preload،
     وصورته المصغّرة وحدها تظهر حتى الضغط. وحين ينتهي مقطع يبدأ الذي يليه.
     ==================================================================== */
  var videos = (function () {
    var V = CFG.videos || {};
    var video = $('#vvideo');
    var list = $('#vlist');
    var playBtn = $('#vplay');
    var nowTitle = $('#vnow-title');
    var panel = $('#vplayer');
    var frame = video && video.closest('.vframe');
    if (!video || !list || !frame) return null;

    var base = fromSiteRoot((V.base || 'videos/').trim());
    var sets = { order: V.order || [], install: V.install || [] };
    var tabs = $$('[data-vset]');
    tabs.forEach(function (t) { if (!(sets[t.dataset.vset] || []).length) t.hidden = true; });

    var current = null;
    var idx = 0;
    var DIGITS = '٠١٢٣٤٥٦٧٨٩';

    function num(n) {
      return AR ? String(n).replace(/\d/g, function (d) { return DIGITS[d]; }) : String(n);
    }
    /* المدّة بالأرقام نفسها التي يكتب بها التطبيق الأوقات: 1:07 */
    function clock(t) {
      t = Math.round(t || 0);
      var s = t % 60;
      return Math.floor(t / 60) + ':' + (s < 10 ? '0' : '') + s;
    }

    function select(name, play) {
      if (!(sets[name] || []).length) return false;
      current = name;
      tabs.forEach(function (t) {
        var on = t.dataset.vset === name;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      if (panel) panel.setAttribute('aria-labelledby', 'vtab-' + name);
      list.innerHTML = '';
      sets[name].forEach(function (v, i) {
        var li = document.createElement('li');
        var b = document.createElement('button');
        b.type = 'button';
        b.innerHTML = '<span class="vnum">' + num(i + 1) + '</span>' +
                      '<span class="vtitle"></span>' +
                      '<span class="vdur">' + (v.t ? clock(v.t) : '') + '</span>';
        $('.vtitle', b).textContent = v[LANG] || v.ar || '';
        b.addEventListener('click', function () { load(i, true); });
        li.appendChild(b);
        list.appendChild(li);
      });
      load(0, play);
      return true;
    }

    function load(i, play) {
      var set = sets[current];
      idx = Math.max(0, Math.min(i, set.length - 1));
      var v = set[idx];
      video.pause();
      video.poster = base + v.file + '.webp';
      video.src = base + v.file + '.mp4';
      $$('button', list).forEach(function (b, n) { b.setAttribute('aria-current', String(n === idx)); });
      if (nowTitle) nowTitle.textContent = v[LANG] || v.ar || '';
      if (play) start();
      else frame.classList.remove('is-on');
    }

    function start() {
      frame.classList.add('is-on');
      video.controls = true;
      var p = video.play();
      if (p && p.catch) p.catch(function () { /* المتصفّح منع التشغيل: تبقى الأزرار */ });
    }

    video.controls = false;
    if (playBtn) playBtn.addEventListener('click', start);
    video.addEventListener('play', function () { frame.classList.add('is-on'); });
    video.addEventListener('ended', function () {
      if (idx < sets[current].length - 1) load(idx + 1, true);
      else { frame.classList.remove('is-on'); video.controls = false; }
    });

    tabs.forEach(function (t) {
      t.addEventListener('click', function () { if (t.dataset.vset !== current) select(t.dataset.vset, false); });
    });
    tabKeys(tabs, function (t) { select(t.dataset.vset, false); });

    if (!select('order', false)) select('install', false);
    return { select: select };
  })();

  /* «شاهد فيديو التثبيت» من دليل التثبيت: يفتح تبويب التثبيت ثمّ ينزل إليه. */
  $$('[data-vgo]').forEach(function (a) {
    a.addEventListener('click', function () { if (videos) videos.select(a.dataset.vgo, false); });
  });

  /* ========================================================================
     ١٢) دليل التثبيت
     تبويب لكلّ نوع جوال. يُفتح تلقائيًّا على جوال الزائر: الآيفون، أو
     سامسونج (رقم طرازها يبدأ بـ SM- في هويّة المتصفّح)، وإلّا شاومي.
     صور التبويبات المخفيّة لا تُحمَّل حتى تُفتح.
     ==================================================================== */
  (function () {
    var tabs = $$('[data-brand]');
    if (!tabs.length) return;
    function pick(t) {
      tabs.forEach(function (x) {
        var on = x === t;
        x.setAttribute('aria-selected', String(on));
        x.tabIndex = on ? 0 : -1;
        var p = document.getElementById(x.getAttribute('aria-controls'));
        if (p) p.hidden = !on;
      });
    }
    tabs.forEach(function (t) { t.addEventListener('click', function () { pick(t); }); });
    tabKeys(tabs, pick);
    var mine = IS_IOS ? 'iphone' : /SM-[A-Z0-9]|Samsung/i.test(UA) ? 'samsung' : 'xiaomi';
    pick(tabs.filter(function (t) { return t.dataset.brand === mine; })[0] || tabs[0]);
  })();

  /* الشريط المتحرّك: نُكرّر العناصر مرّة واحدة ليكون الدوران بلا فجوة */
  (function () {
    var track = $('#ticker-track');
    if (!track || REDUCE) return;
    track.innerHTML += track.innerHTML;
    $$('li', track).forEach(function (li, i, all) {
      if (i >= all.length / 2) li.setAttribute('aria-hidden', 'true');
    });
  })();

  /* تذكّر لغة الزائر، وسنة الفوتر */
  $$('[data-lang-switch]').forEach(function (a) {
    a.addEventListener('click', function () { writeStore('talabati-lang', a.dataset.langSwitch); });
  });
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* أوّل حساب للحركة — بعد إطارين، ليُرسم الوضع الابتدائي أوّلًا فتعمل
     الانتقالات فعلًا بدل أن يقفز كل شيء إلى وضعه النهائي دفعةً واحدة. */
  requestAnimationFrame(function () { requestAnimationFrame(onScroll); });

  /* شبكتا أمان: المتصفّح يُجمّد requestAnimationFrame في الصفحات المخفيّة (تبويب
     في الخلفية مثلًا)، فلو اكتفينا به لبقي المحتوى غير ظاهر. المؤقّت يعمل في
     الحالتين، وحدث الظهور يُعيد الحساب فور عودة الزائر إلى التبويب. */
  setTimeout(onScroll, 500);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { ticking = false; onScroll(); }
  });
})();
