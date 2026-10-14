'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('../app.js'), 'utf8');
const start = source.indexOf("$$('[data-nav=\"home\"]')");
const end = source.indexOf("$('.guide-filters').addEventListener", start);
if (start < 0 || end < start) throw new Error('Home navigation registration was not found');
const registration = source.slice(start, end);

function homeNavigation({ reading = false } = {}) {
  const listeners = new Map();
  const links = ['brand', 'home-menu'].map(name => ({
    addEventListener(type, listener) {
      if (type !== 'click') throw new Error('Unexpected home navigation event: ' + type);
      listeners.set(name, listener);
    }
  }));
  const main = {
    scrollLeft: 0,
    scrollTop: 497,
    scrollTo(left, top) {
      if (typeof left === 'object') {
        this.scrollLeft = left.left ?? this.scrollLeft;
        this.scrollTop = left.top ?? this.scrollTop;
      } else {
        this.scrollLeft = left;
        this.scrollTop = top;
      }
    }
  };
  const pageWindow = {
    scrollY: 0,
    scrollTo(left, top) { this.scrollY = top; }
  };
  const context = {
    stage: { dataset: { view: 'home' } },
    state: { step: reading ? 'pick' : 'intent' },
    pendingView: null,
    leavePromptOpen: false,
    inReading: () => reading,
    openLeaveDialog() { context.leavePromptOpen = true; },
    showHome() { context.stage.dataset.view = 'home'; },
    go(step) { context.state.step = step; },
    window: pageWindow,
    $(selector) {
      if (selector === 'main') return main;
      throw new Error('Unexpected element selection: ' + selector);
    },
    $$(selector) {
      if (selector === '[data-nav="home"]') return links;
      throw new Error('Unexpected home navigation selection: ' + selector);
    }
  };
  vm.runInNewContext(registration, context, { filename: 'app.js' });
  return {
    main,
    pageWindow,
    context,
    click(name) {
      const event = new Event('click', { cancelable: true });
      listeners.get(name)(event);
      return event;
    }
  };
}

test('home links return from the resource section to the reading interface', () => {
  for (const name of ['brand', 'home-menu']) {
    const navigation = homeNavigation();
    const event = navigation.click(name);
    assert(event.defaultPrevented, name + ' must use the app navigation');
    assert.equal(navigation.main.scrollTop, 0, name + ' left the reading interface scrolled offscreen');
  }
});

test('home navigation preserves the current reading until leaving is confirmed', () => {
  for (const name of ['brand', 'home-menu']) {
    const navigation = homeNavigation({ reading: true });
    navigation.pageWindow.scrollY = 120;
    const event = navigation.click(name);
    assert(event.defaultPrevented, name + ' must not bypass the leave confirmation');
    assert.equal(navigation.context.pendingView, 'home');
    assert.equal(navigation.context.leavePromptOpen, true);
    assert.equal(navigation.context.state.step, 'pick');
    assert.equal(navigation.main.scrollTop, 497, name + ' scrolled before leaving was confirmed');
    assert.equal(navigation.pageWindow.scrollY, 120, name + ' scrolled the document before confirmation');
  }
});
