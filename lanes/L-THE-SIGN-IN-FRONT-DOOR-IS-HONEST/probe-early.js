// The window nobody could see. Polls the document every 10ms from the moment of navigation and
// clicks «Send kode» THE FIRST TIME the button exists — from inside the page, so there is no
// Playwright actionability wait between seeing it and pressing it, which is the whole point.
//
// Records, per sample: pathname, whether the send button is there, how many OTP boxes there are,
// and an identity stamp written onto the modal element so a SECOND modal (a fresh component after a
// route change) is distinguishable from the one that was clicked.
//
// Usage: node probe-early.js [WEB_ORIGIN] [DEEP_LINK] [OUT_TAG]
const { chromium } = require('/Users/svendaneel/okam/web-livewalk/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const WEB = process.argv[2] || 'http://127.0.0.1:3971';
const DEEP = process.argv[3] || '/admin/overview';
const TAG = process.argv[4] || 'early';
const PHONE = '99681931';

function log (...a) { process.stdout.write(a.join(' ') + '\n'); }

async function main () {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => {
    const t0 = Date.now();
    window.__probe = { samples: [], click: null, nextId: 1 };
    const tick = () => {
      const modal = document.querySelector('.login-modal');
      if (modal && !modal.dataset.probeId) { modal.dataset.probeId = String(window.__probe.nextId++); }
      const btn = modal && modal.querySelector('button.btn--primary');
      const boxes = document.querySelectorAll('.login-modal .otp-input input').length;
      const s = {
        ms: Date.now() - t0,
        p: location.pathname + location.search,
        modalId: modal ? modal.dataset.probeId : null,
        btn: !!btn,
        boxes: boxes
      };
      const last = window.__probe.samples[window.__probe.samples.length - 1];
      if (!last || last.p !== s.p || last.modalId !== s.modalId || last.btn !== s.btn || last.boxes !== s.boxes) {
        window.__probe.samples.push(s);
      }
      // First sight of the button: fill and press it, right now.
      if (btn && !window.__probe.click) {
        const tel = modal.querySelector('input[type="tel"]');
        if (tel) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(tel, window.__probePhone);
          tel.dispatchEvent(new Event('input', { bubbles: true }));
        }
        window.__probe.click = { ms: Date.now() - t0, onModalId: modal.dataset.probeId, path: location.pathname + location.search };
        btn.click();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const page = await context.newPage();
  await page.addInitScript(`window.__probePhone = ${JSON.stringify(PHONE)};`);

  const requests = [];
  page.on('request', r => {
    if (/verification|token/i.test(r.url())) { requests.push({ method: r.method(), url: r.url().slice(0, 140) }); }
  });

  await page.goto(WEB + DEEP, { waitUntil: 'commit' });
  await page.waitForTimeout(14000);

  const probe = await page.evaluate(() => ({
    click: window.__probe.click,
    samples: window.__probe.samples,
    final: {
      path: location.pathname + location.search,
      boxes: document.querySelectorAll('.login-modal .otp-input input').length,
      modalId: (document.querySelector('.login-modal') || {}).dataset ? document.querySelector('.login-modal').dataset.probeId : null,
      says: (() => { const a = document.querySelector('.login-modal .alert--error'); return a ? a.textContent.replace(/\s+/g, ' ').trim() : null; })(),
      btn: !!(document.querySelector('.login-modal button.btn--primary'))
    }
  }));
  await page.screenshot({ path: path.join(__dirname, TAG + '-probe.png'), fullPage: true });
  await browser.close();

  const out = { web: WEB, deepLink: DEEP, at: new Date().toISOString(), verificationRequests: requests, click: probe.click, final: probe.final, samples: probe.samples };
  fs.writeFileSync(path.join(__dirname, 'probe-' + TAG + '.json'), JSON.stringify(out, null, 2));
  log('CLICKED  :', JSON.stringify(probe.click));
  log('REQUESTS :', JSON.stringify(requests));
  log('FINAL    :', JSON.stringify(probe.final));
  log('SAMPLES  :');
  for (const s of probe.samples) { log('  ' + JSON.stringify(s)); }
}

main().catch(e => { log('FATAL', String(e)); process.exit(1); });
