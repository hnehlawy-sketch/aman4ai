import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

// Function to find the directory containing index.html
function findDistPath(startPath) {
  const possiblePaths = [
    path.join(startPath, 'dist', 'browser'),
    path.join(startPath, 'dist'),
    path.join(startPath, 'browser'),
    path.join(startPath, 'public'),
    path.join(startPath, 'build'),
    startPath // Last resort
  ];

  for (const p of possiblePaths) {
    const indexPath = path.join(p, 'index.html');
    if (fs.existsSync(indexPath)) {
      console.log(`[Server] Found index.html at: ${indexPath}`);
      return p;
    }
  }
  return null;
}

const DIST_DIR = findDistPath(process.cwd());

if (!DIST_DIR) {
  console.error('[Server] CRITICAL ERROR: Could not find index.html in any expected location.');
  console.error(`[Server] Current directory: ${process.cwd()}`);
  try {
    console.error(`[Server] Directory listing: ${fs.readdirSync(process.cwd())}`);
    if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
       console.error(`[Server] dist listing: ${fs.readdirSync(path.join(process.cwd(), 'dist'))}`);
    }
  } catch (e) {
    console.error(`[Server] Failed to list directory: ${e}`);
  }
} else {
  console.log(`[Server] Serving static files from: ${DIST_DIR}`);
}

const server = http.createServer((req, res) => {
  console.log(`[Request] ${req.method} ${req.url}`);

  // Health Check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }

  // Determine file path
  let filePath = req.url === '/' ? 'index.html' : req.url;
  // Remove query string
  filePath = filePath.split('?')[0];
  
  let absolutePath = path.join(DIST_DIR || process.cwd(), filePath);

  // Check if file exists
  fs.stat(absolutePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA Fallback: Serve index.html for unknown routes
      if (DIST_DIR) {
          absolutePath = path.join(DIST_DIR, 'index.html');
      } else {
          res.writeHead(404);
          res.end('Application not found (Build failed?)');
          return;
      }
    }

    // Read and serve file
    fs.readFile(absolutePath, (err, content) => {
      if (err) {
        if (err.code === 'ENOENT') {
          console.error(`[Error] File not found (even fallback): ${absolutePath}`);
          res.writeHead(404);
          res.end('Not Found');
        } else {
          console.error(`[Error] Server error: ${err.code}`);
          res.writeHead(500);
          res.end(`Server Error: ${err.code}`);
        }
      } else {
        // Set Content-Type
        const ext = path.extname(absolutePath).toLowerCase();
        const mimeTypes = {
          '.html': 'text/html',
          '.js': 'text/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.wav': 'audio/wav',
          '.mp4': 'video/mp4',
          '.woff': 'application/font-woff',
          '.ttf': 'application/font-ttf',
          '.eot': 'application/vnd.ms-fontobject',
          '.otf': 'application/font-otf',
          '.wasm': 'application/wasm'
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}/`);
  if (DIST_DIR) {
      console.log(`Serving files from: ${DIST_DIR}`);
  } else {
      console.log(`WARNING: No dist directory found. Server will likely return 404s.`);
  }
});
