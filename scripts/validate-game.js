#!/usr/bin/env node
'use strict';

// Lightweight pre-build checks for the WebView game. This does not alter gameplay.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(process.cwd(), 'app/src/main/assets/index.html');
if (!fs.existsSync(htmlPath)) {
  console.error('FAIL: game HTML not found:', htmlPath);
  process.exit(1);
}
const html = fs.readFileSync(htmlPath, 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)]
  .map(match => match[1])
  .filter(source => source.trim());

if (scripts.length === 0) {
  console.error('FAIL: no inline JavaScript found in game HTML');
  process.exit(1);
}

let checked = 0;
for (const [index, source] of scripts.entries()) {
  try {
    // Parse only; never execute browser-dependent game code in CI.
    new vm.Script(source, { filename: `index.html:inline-script-${index + 1}` });
    checked++;
  } catch (error) {
    console.error(`FAIL: JavaScript syntax error in inline script ${index + 1}`);
    console.error(error.message);
    process.exit(1);
  }
}

const requiredMarkers = [
  'function loadMeta',
  'function particle',
  'function ambientBurst',
  'function draw',
  'MAX_PARTICLES',
  'requestAnimationFrame'
];
const missing = requiredMarkers.filter(marker => !html.includes(marker));
if (missing.length) {
  console.error('FAIL: expected game components missing:', missing.join(', '));
  process.exit(1);
}

console.log(`PASS: parsed ${checked} inline JavaScript block(s); required game components are present.`);
