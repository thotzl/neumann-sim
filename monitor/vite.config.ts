import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Custom Vite Plugin for VoG API
const vogPlugin = () => ({
  name: 'vog-api',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.method === 'POST' && req.url === '/api/vog') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            // Den echten Pfad aus dem Symlink auflösen
            const publicVerse = path.resolve(__dirname, 'public/live_verse');
            if (fs.existsSync(publicVerse) && data.message) {
                const realVerse = fs.realpathSync(publicVerse);
                const expRoot = path.dirname(realVerse);
                const msgFile = path.join(expRoot, 'creator_msg.txt');
                fs.writeFileSync(msgFile, data.message);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ status: 'success' }));
            } else {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'No message or verse not linked' }));
            }
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
        return;
      }
      next();
    });
  }
});

export default defineConfig({
  plugins: [react(), vogPlugin()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    fs: {
      allow: ['..']
    }
  }
})
