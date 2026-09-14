const http = require('http');
const fs = require('fs');
const path = require('path');

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
  await send('Page.navigate', { url: 'http://127.0.0.1:8877/index.html?shot=1' });
  await new Promise((r) => setTimeout(r, 1000));
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const out = path.join('D:\\MIMO CODE\\爬\\output', 'board-cdp.png');
  fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log('wrote', out, fs.statSync(out).size);
  ws.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
