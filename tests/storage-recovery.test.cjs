const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../reading.js');
const cards = require('../cards.js');
const spreads = require('../spreads.js');
const KEY = 'kd.readings.v1';
const make = (storage) => R.createService({cards, spreads, storage});

for (const raw of ['', '{}', 'null', 'false', '[null,3,"broken"]', '{broken']) {
  test(`invalid stored readings recover without breaking history: ${raw}`, async () => {
    const storage = R.memoryStorage();
    storage.setItem(KEY, raw);
    const svc = make(storage);
    assert.deepEqual(await svc.list(), []);
    assert.equal(await svc.draft(), null);
    assert.equal(svc.storageStatus().recovered, true);
    assert.equal(storage.getItem(KEY + '.recovery'), raw);
  });
}

test('mixed corrupt records retain valid draft and backup before creating another reading', async () => {
  const storage = R.memoryStorage();
  const svc = make(storage);
  const {readingId} = await svc.createReading({spreadId:'three'});
  await svc.pick(readingId, 0, 4);
  const valid = JSON.parse(storage.getItem(KEY))[0];
  const brokenCard = {...valid, id:'broken', cards:[{...valid.cards[0],cardId:'missing'}]};
  const raw = JSON.stringify([null, valid, brokenCard, {id:'bad',spreadId:'missing'}]);
  storage.setItem(KEY, raw);
  assert.equal((await svc.draft()).id, readingId);
  await svc.createReading({spreadId:'career'});
  assert.equal((await svc.get(readingId)).cards[0].fanIndex, 4);
  assert.equal(JSON.parse(storage.getItem(KEY)).length, 2);
  assert.equal(storage.getItem(KEY + '.recovery'), raw);
});

test('a full store rejects creation as a promise and allows retry without deleting history', async () => {
  const storage = R.memoryStorage();
  const original = storage.setItem;
  let full = false;
  storage.setItem = (key,value) => { if (full && key === KEY) throw new DOMException('Quota exceeded','QuotaExceededError'); original(key,value); };
  const svc = make(storage);
  const first = await svc.createReading({spreadId:'three'});
  const before = storage.getItem(KEY);
  full = true;
  let result;
  assert.doesNotThrow(() => {result = svc.createReading({spreadId:'career'});});
  await assert.rejects(result, error => error.code === 'storage-full');
  assert.equal(storage.getItem(KEY), before);
  full = false;
  await svc.createReading({spreadId:'career'});
  assert.equal((await svc.get(first.readingId)).id, first.readingId);
});

test('corruption recovery works when the recovery backup cannot be stored', async () => {
  const storage = R.memoryStorage();
  storage.setItem(KEY,'{}');
  const original = storage.setItem;
  storage.setItem = (key,value) => {if(key.endsWith('.recovery'))throw new DOMException('Full','QuotaExceededError');original(key,value);};
  const svc = make(storage);
  assert.deepEqual(await svc.list(),[]);
  assert.equal(storage.getItem(KEY),'{}');
  assert.equal(svc.storageStatus().backupSaved,false);
  await assert.rejects(svc.createReading({spreadId:'daily'}), error => error.code === 'storage-recovery');
  assert.equal(storage.getItem(KEY),'{}');
});

test('a recovery backup remains discoverable after valid readings are saved and the app reloads',async()=>{
  const storage=R.memoryStorage();storage.setItem(KEY,'{broken');
  const svc=make(storage);await svc.list();await svc.createReading({spreadId:'three'});
  const reloaded=make(storage);await reloaded.list();
  assert.equal(reloaded.storageStatus().recovered,true);
  assert.equal(reloaded.storageStatus().backupSaved,true);
  assert.equal(reloaded.recoveryBackup(),'{broken');
});

test('read-only startup retains saved history and skips expired drafts without throwing', async () => {
  const storage = R.memoryStorage();
  const svc = make(storage);
  const {readingId} = await svc.createReading({spreadId:'daily'});
  await svc.pick(readingId,0,4);
  await svc.complete(readingId);
  await svc.markViewed(readingId);
  const {readingId: expired} = await svc.createReading({spreadId:'three'});
  await svc.pick(expired,0,5);
  const list = JSON.parse(storage.getItem(KEY));
  list[1].createdAt = '2020-01-01T00:00:00.000Z';
  storage.setItem(KEY,JSON.stringify(list));
  const original = storage.getItem(KEY);
  storage.setItem = () => {throw new DOMException('full','QuotaExceededError');};
  const readOnly = make(storage);
  assert.equal((await readOnly.list())[0].id,readingId);
  assert.equal((await readOnly.dailyToday()).id,readingId);
  assert.equal(await readOnly.draft(),null);
  assert.equal(storage.getItem(KEY),original);
});

test('fresh read-only storage allows the home query, then rejects creating an unsaved reading', async () => {
  const storage = R.memoryStorage();
  storage.setItem = () => {throw new DOMException('full','QuotaExceededError');};
  const svc = make(storage);
  assert.equal(await svc.dailyToday(),null);
  assert.equal(await svc.draft(),null);
  await assert.rejects(svc.createReading({spreadId:'daily'}), error => error.code === 'storage-full');
  assert.equal(storage.getItem(KEY),null);
});

test('every reading write rejects as a promise on quota and can be retried', async () => {
  const storage = R.memoryStorage(), original = storage.setItem;
  let full = false;
  storage.setItem = (key,value) => {if(full)throw new DOMException('full','QuotaExceededError');original(key,value);};
  const svc = make(storage);
  const {readingId} = await svc.createReading({spreadId:'daily'});
  await svc.pick(readingId,0,4);
  for (const action of [()=>svc.complete(readingId),()=>svc.reveal(readingId,'today'),()=>svc.markViewed(readingId),()=>svc.saveClosing(readingId,'Kapanış metni','template'),()=>svc.patch(readingId,{note:'Not'})]) {
    const before = storage.getItem(KEY);
    full = true;
    let promise;
    assert.doesNotThrow(()=>{promise = action();});
    await assert.rejects(promise,error=>error.code==='storage-full');
    assert.equal(storage.getItem(KEY),before);
    full = false;
    await action();
  }
});

for (const broken of [{positions:null},{summary:{}},{positions:[{positionKey:'today',text:{}}]},{pairs:[{keys:['missing'],text:'bad'}]},{closing:{}}]) {
  test('malformed cached interpretation regenerates while preserving the drawn cards: '+JSON.stringify(broken),async()=>{
    const storage = R.memoryStorage(),svc = make(storage);
    const {readingId} = await svc.createReading({spreadId:'daily'});
    await svc.pick(readingId,0,4);
    await svc.complete(readingId);
    const list=JSON.parse(storage.getItem(KEY)),drawn=structuredClone(list[0].cards);
    Object.assign(list[0].interpretation,broken);
    storage.setItem(KEY,JSON.stringify(list));
    const result = await svc.complete(readingId);
    assert.equal(typeof result.summary,'string');
    assert.equal(result.positions[0].positionKey,'today');
    assert.equal(typeof result.positions[0].text,'string');
    assert.equal(result.closing,undefined);
    assert.equal(result.pairs,undefined);
    assert.deepEqual((await svc.get(readingId)).cards,drawn);
  });
}
