const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
function calendar(options){assert(fs.existsSync(require.resolve('../cards.js').replace('cards.js','reminder.js')),'Calendar reminder module missing');return require('../reminder.js').calendar(options);}
const opts={time:'09:00',now:new Date('2026-10-07T08:59:00'),url:'https://example.test/'};
const unfold=text=>text.replace(/\r\n /g,'');
test('daily reminder starts at selected local time and includes a calendar alarm',()=>{
  const text=unfold(calendar(opts));
  assert.match(text,/DTSTART:20261007T090000\r\n/);
  assert.match(text,/RRULE:FREQ=DAILY\r\n/);
  assert.match(text,/BEGIN:VALARM\r\nTRIGGER:PT0S\r\nACTION:DISPLAY/);
  assert.match(text,/URL:https:\/\/example.test\//);
  assert.equal(text.endsWith('END:VCALENDAR\r\n'),true);
});
test('a reminder time already passed starts tomorrow across a year boundary',()=>{
  const text=calendar({...opts,now:new Date('2026-12-31T09:01:00')});
  assert.match(text,/DTSTART:20270101T090000/);
});
test('selected afternoon time is retained without using the machine UTC offset',()=>{
  assert.match(calendar({...opts,time:'18:45'}),/DTSTART:20261007T184500/);
});
test('invalid or missing time cannot generate a broken calendar',()=>{
  for(const time of ['',null,'25:00','09:60','09:00\nBEGIN:VEVENT'])assert.throws(()=>calendar({...opts,time}),/saat/i);
});
test('calendar URL rejects script protocols and strips private query and fragment',()=>{
  assert.throws(()=>calendar({...opts,url:'javascript:alert(1)'}),/adres/i);
  const text=unfold(calendar({...opts,url:'https://example.test/?question=private#secret'}));
  assert.match(text,/URL:https:\/\/example.test\//);
  assert(!text.includes('private')&&!text.includes('secret'));
  for(const line of calendar(opts).split('\r\n'))assert(Buffer.byteLength(line)<=75,'Calendar line exceeds 75 octets');
});
