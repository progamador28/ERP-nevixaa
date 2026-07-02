const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5000;
const STATE_FILE = path.join(__dirname, 'state.json');

// Mapeamento de tipos de mídia
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.json': 'application/json'
};

const server = http.createServer((req, res) => {
    // 1. Rota de API para obter o estado
    if (req.url === '/api/state' && req.method === 'GET') {
        fs.readFile(STATE_FILE, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({}));
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(data || '{}');
        });
        return;
    }

    // 2. Rota de API para salvar o estado
    if (req.url === '/api/state' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            fs.writeFile(STATE_FILE, body, 'utf8', (err) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Erro ao salvar o estado' }));
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            });
        });
        return;
    }

    // 3. Servir arquivos estáticos
    let urlPath = req.url === '/' ? 'index.html' : req.url;
    // Decodifica caracteres especiais como %20
    let decodedUrl = decodeURIComponent(urlPath);
    let filePath = path.join(__dirname, decodedUrl);
    const ext = path.extname(filePath);
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Arquivo nao encontrado');
            return;
        }
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/plain' });
        res.end(content);
    });
});

server.listen(PORT, () => {
    console.log(`Servidor Nevixa rodando em http://localhost:${PORT}`);
});
