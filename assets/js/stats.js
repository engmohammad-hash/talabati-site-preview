/* ============================================================================
   طلباتي — نبضة الإحصاءات
   ----------------------------------------------------------------------------
   يرسل سطرًا واحدًا عند فتح الصفحة، وسطرًا عند كل ضغطة على زرّ مهمّ، إلى
   stats/collect.php على استضافتك. لا كوكيز، ولا معرّف يبقى في المتصفّح، ولا
   اتصال بأيّ خدمة خارجية.

   إن لم تعمل PHP على الاستضافة، أو أُوقفت الإحصاءات من config.js، فلا يحدث
   شيء: الطلب يفشل بصمت والموقع يعمل كما هو. الإرسال بـ sendBeacon، فهو لا
   يؤخّر فتح الصفحة ولا يُلغى حين يغادرها الزائر.
   ========================================================================== */
(function () {
  'use strict';

  var CFG = (window.TALABATI || {}).stats || {};
  if (CFG.enabled === false) return;

  /* جذر الموقع من عنوان هذا الملفّ نفسه: الصفحة العربية في الجذر والإنجليزية
     في /en/، فالمسار النسبيّ وحده لا يكفي. */
  var self = document.currentScript && document.currentScript.src;
  if (!self) return;
  var endpoint = self.replace(/assets\/js\/stats\.js.*$/, '') + (CFG.endpoint || 'stats/collect.php');

  function send(event) {
    var body;
    try {
      body = JSON.stringify({
        e: event,
        p: location.pathname,
        r: document.referrer || '',
        l: navigator.language || '',
        w: window.innerWidth || 0,
        g: document.documentElement.lang || ''
      });
    } catch (e) { return; }

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, new Blob([body], { type: 'text/plain;charset=UTF-8' }));
      } else {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', endpoint, true);
        xhr.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
        xhr.send(body);
      }
    } catch (e) { /* لا شيء: الإحصاء لا يعطّل الموقع أبدًا */ }
  }

  send('view');

  /* الضغطات المهمّة. نستمع على الصفحة كلّها لا على كل زرّ، فالأزرار تتكرّر في
     الواجهة وقسم التنزيل والقائمة الجانبية، وبعضها يُضاف بعد التحميل. */
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-apk], [data-ios], [data-wa], [data-ios-open]') : null;
    if (!el) return;
    if (el.hasAttribute('data-apk'))      send('dl_android');
    else if (el.hasAttribute('data-wa'))  send('wa');
    else if (el.hasAttribute('data-ios-open')) send('app');
    else                                  send('dl_ios');
  }, true);
})();
