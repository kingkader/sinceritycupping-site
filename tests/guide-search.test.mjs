import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

function page() {
  const input = {value: '', focus() {this.focused = true;}, addEventListener(event, fn) {this[event] = fn;}};
  const reset = {addEventListener(event, fn) {this[event] = fn;}};
  const status = {textContent: ''};
  const empty = {hidden: true};
  const region = {hidden: true};
  const cards = ['First hijama appointment in Streatham', 'Wet cupping for women and men', 'Cupping from Balham'].map(textContent => ({textContent, hidden:false}));
  const nodes = {'[data-guide-search]':region, '#guide-query':input, '[data-guide-reset]':reset, '#guide-search-status':status, '#guide-empty':empty};
  const document = {querySelector: s => nodes[s] || null, querySelectorAll: s => s === '[data-guide-card]' ? cards : []};
  const window = {scrollY:0, addEventListener() {}, matchMedia: () => ({matches:true})};
  vm.runInNewContext(fs.readFileSync(new URL('../assets/js/site.js', import.meta.url),'utf8'), {document,window,setTimeout});
  return {input,reset,status,empty,region,cards};
}

test('guide search matches all words regardless of case and surrounding whitespace', () => {
  const p=page(); assert.equal(p.region.hidden,false);
  p.input.value='  WOMEN cupping  '; p.input.input();
  assert.deepEqual(p.cards.map(c=>c.hidden),[true,false,true]);
  assert.equal(p.status.textContent,'1 guide found');
});

test('empty search result has recovery and reset restores every guide', () => {
  const p=page(); p.input.value='NoSuchPlace'; p.input.input();
  assert.equal(p.empty.hidden,false); assert.ok(p.cards.every(c=>c.hidden));
  p.reset.click(); assert.equal(p.input.value,''); assert.equal(p.empty.hidden,true);
  assert.ok(p.cards.every(c=>!c.hidden)); assert.equal(p.input.focused,true);
  assert.equal(p.status.textContent,'3 guides found');
});

test('punctuation in a query is treated as text rather than HTML or a regular expression', () => {
  const p=page(); p.input.value='<script>['; p.input.input();
  assert.equal(p.status.textContent,'0 guides found');
});
