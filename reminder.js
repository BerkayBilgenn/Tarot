(function(root) {
  'use strict';
  const pad = value => String(value).padStart(2, '0');
  const localStamp = date => `${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
  const text = value => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
  function fold(line) {
    const encoder = new TextEncoder();
    let result = '', length = 0;
    for (const char of line) {
      const size = encoder.encode(char).length;
      if (length + size > 75) { result += '\r\n '; length = 1; }
      result += char; length += size;
    }
    return result;
  }
  function calendar({ time, now = new Date(), url }) {
    if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Geçerli bir saat seç.');
    let target;
    try { target = new URL(url); } catch { throw new Error('Geçerli bir site adresi gerekli.'); }
    if (!['https:', 'http:'].includes(target.protocol)) throw new Error('Geçerli bir site adresi gerekli.');
    target.search = ''; target.hash = ''; target.username = ''; target.password = '';
    const start = new Date(now);
    const [hours, minutes] = time.split(':').map(Number);
    start.setHours(hours, minutes, 0, 0);
    if (start <= now) start.setDate(start.getDate() + 1);
    const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    // Floating local time: the importing calendar keeps the chosen wall-clock time.
    return [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Miloruna//Daily Card//TR', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT', `UID:miloruna-daily-${time.replace(':','')}@${target.hostname}`, `DTSTAMP:${stamp}`,
      `DTSTART:${localStamp(start)}`, 'DURATION:PT5M', 'RRULE:FREQ=DAILY',
      `SUMMARY:${text('Miloruna · Günün kartı')}`, `DESCRIPTION:${text('Bir nefes al. Miloruna’da günün kartını çek. Hatırlatma bildirimini takvim uygulamanda etkinleştir.')}`,
      `URL:${target.href}`, 'TRANSP:TRANSPARENT', 'BEGIN:VALARM', 'TRIGGER:PT0S', 'ACTION:DISPLAY',
      `DESCRIPTION:${text('Miloruna · Günün kartını çek.')}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'
    ].map(fold).join('\r\n') + '\r\n';
  }
  const api = { calendar };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TAROT_REMINDER = api;
})(typeof window !== 'undefined' ? window : globalThis);
