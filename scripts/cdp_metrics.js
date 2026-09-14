const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

(async () => {
  const list = await get('http://127.0.0.1:9223/json/list');
  const page = list.find((t) => t.type === 'page') || list[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id).resolve(msg.result || msg.error);
      pending.delete(msg.id);
    }
  };

  await new Promise((r) => (ws.onopen = r));
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await send('Page.enable');
  await send('Page.navigate', { url: 'http://127.0.0.1:8877/index.html?cdp=1' });
  await new Promise((r) => setTimeout(r, 800));
  const result = await send('Runtime.evaluate', {
    expression: `(() => {
      const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return {x:+b.x.toFixed(1), w:+b.width.toFixed(1), right:+b.right.toFixed(1)}; };
      return JSON.stringify({
        vw: innerWidth,
        vh: innerHeight,
        app: r(document.querySelector('.app')),
        stage: r(document.querySelector('.stage')),
        wrap: r(document.querySelector('.board-wrap')),
        board: r(document.querySelector('.board')),
        lastPiece: r([...document.querySelectorAll('.piece')].pop()),
        pieceCount: document.querySelectorAll('.piece').length,
        scrollW: document.documentElement.scrollWidth,
        bodyW: document.body.scrollWidth
      });
    })()`,
    returnByValue: true,
  });
  console.log(result.result.value);
  ws.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
