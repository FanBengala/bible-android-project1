/* www/notifications.js
 * Ежедневное напоминание о плане чтения через @capacitor/local-notifications.
 * Требует: <script src="notifications.js"></script> в index.html.
 * В браузере и в bible-web.html плагин отсутствует — функции становятся no-op.
 */
(function (global) {
  'use strict';

  var CHANNEL_ID  = 'daily-reminder';
  var REMINDER_ID = 1001;
  var TEST_ID     = 1002;
  var STORAGE_KEY = 'bible.reminder.v1';

  function isNative() {
    return !!(global.Capacitor && global.Capacitor.isNativePlatform && global.Capacitor.isNativePlatform());
  }

  function getLN() {
    if (!isNative()) return null;
    return (global.Capacitor.Plugins && global.Capacitor.Plugins.LocalNotifications) || null;
  }

  function loadSettings() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { enabled: false, hour: 20, minute: 0 };
  }

  function saveSettings(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
  }

  async function ensurePermission() {
    var LN = getLN();
    if (!LN) return false;
    var perm = await LN.checkPermissions();
    if (perm.display !== 'granted') perm = await LN.requestPermissions();
    return perm.display === 'granted';
  }

  async function ensureChannel(LN) {
    // createChannel по id идемпотентен. ВАЖНО: если канал уже создан с другими
    // importance/sound, Android не даст их поменять — при проблемах смени CHANNEL_ID.
    await LN.createChannel({
      id: CHANNEL_ID,
      name: 'Երեկոյան հիշեցում',
      description: 'Ամենօրյա ընթերցանության հիշեցում',
      importance: 5,
      sound: 'default',
      vibration: true,
      lights: true
    });
  }

  async function openExactAlarmSettings() {
    var LN = getLN();
    if (!LN) return false;
    try {
      if (typeof LN.changeExactNotificationSetting === 'function') {
        await LN.changeExactNotificationSetting();
        return true;
      }
    } catch (e) {}
    return false;
  }

  function nextOccurrence(hour, minute) {
    var at = new Date();
    at.setHours(hour, minute, 0, 0);
    if (at.getTime() <= Date.now() + 1000) at.setDate(at.getDate() + 1);
    return at;
  }

  async function schedule(hour, minute) {
    var LN = getLN();
    if (!LN) throw new Error('Уведомления доступны только в APK, не в браузере.');
    if (!(await ensurePermission())) throw new Error('Разрешение на уведомления не выдано.');
    await ensureChannel(LN);

    try { await LN.cancel({ notifications: [{ id: REMINDER_ID }] }); } catch (e) {}

    var at = nextOccurrence(hour, minute);
    await LN.schedule({
      notifications: [{
        id: REMINDER_ID,
        title: 'Աստվածաշունչ',
        body: 'Ժամանակն է կարդալու այսօրվա պլանը։',
        channelId: CHANNEL_ID,
        schedule: {
          at: at,
          repeats: true,
          every: 'day',
          allowWhileIdle: true
        }
      }]
    });
    return at;
  }

  async function cancel() {
    var LN = getLN();
    if (!LN) return;
    try { await LN.cancel({ notifications: [{ id: REMINDER_ID }, { id: TEST_ID }] }); } catch (e) {}
  }

  async function sendTest(delaySeconds) {
    var LN = getLN();
    if (!LN) throw new Error('Уведомления только в APK.');
    if (!(await ensurePermission())) throw new Error('Нет разрешения.');
    await ensureChannel(LN);
    await LN.schedule({
      notifications: [{
        id: TEST_ID,
        title: 'Աստվածաշունչ',
        body: 'Թեստային ծանուցում․ աշխատում է։',
        channelId: CHANNEL_ID,
        schedule: { at: new Date(Date.now() + (delaySeconds || 5) * 1000), allowWhileIdle: true }
      }]
    });
  }

  async function pending() {
    var LN = getLN();
    if (!LN) return { notifications: [] };
    return LN.getPending();
  }

  async function enable(hour, minute) {
    var s = { enabled: true, hour: (hour != null ? hour : 20), minute: (minute != null ? minute : 0) };
    saveSettings(s);
    await schedule(s.hour, s.minute);
    return s;
  }

  async function disable() {
    var s = loadSettings();
    s.enabled = false;
    saveSettings(s);
    await cancel();
    return s;
  }

  async function init() {
    var s = loadSettings();
    if (!isNative()) return s;               // браузер — просто вернуть сохранённое
    if (!s.enabled) return s;                // пользователь выключил
    try {
      var p = await pending();
      var has = (p.notifications || []).some(function (n) { return n.id === REMINDER_ID; });
      if (!has) await schedule(s.hour, s.minute);
    } catch (e) {
      console.warn('[reminders] init failed', e);
    }
    return s;
  }

  global.BibleReminders = {
    isNative: isNative,
    init: init,
    enable: enable,
    disable: disable,
    schedule: schedule,
    cancel: cancel,
    sendTest: sendTest,
    pending: pending,
    getSettings: loadSettings,
    openExactAlarmSettings: openExactAlarmSettings
  };
})(window);
