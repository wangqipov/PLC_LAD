const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const root = __dirname;
const port = 4173;
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function safeJoin(base, urlPath) {
  const decoded = decodeURIComponent((urlPath || '/').split('?')[0]);
  const target = path.normalize(path.join(base, decoded === '/' ? 'index.html' : decoded));
  if (!target.startsWith(base)) {
    return null;
  }
  return target;
}

const server = http.createServer((req, res) => {
  let file = safeJoin(root, req.url);
  if (!file) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (!path.extname(file) && fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    file = path.join(file, 'index.html');
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      fs.readFile(path.join(root, '404.html'), (err404, page) => {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(err404 ? 'Not found' : page);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(port, () => {
  const url = `http://127.0.0.1:${port}/`;
  console.log(`LAD 静态包: ${url}`);
  exec(`start ${url}`);
});
