import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.html') return 'text/html; charset=utf-8';
    if (ext === '.txt') return 'text/plain; charset=utf-8';
    if (ext === '.css') return 'text/css; charset=utf-8';
    if (ext === '.js') return 'application/javascript; charset=utf-8';
    if (ext === '.json') return 'application/json; charset=utf-8';
    if (ext === '.png') return 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.gif') return 'image/gif';
    if (ext === '.svg') return 'image/svg+xml';
    if (ext === '.webp') return 'image/webp';

    return 'application/octet-stream';
}

const server = http.createServer(async (request, response) => {

    if (request.url === '/') {
        try {
            const content = await fs.readFile('index.html', 'utf8');
            response.statusCode = 200;
            response.setHeader('Content-Type', 'text/html; charset=utf-8')
            response.end(content);
        } catch (error) {
            console.log(error);
            response.statusCode = 500;
            response.setHeader('Content-Type', 'text/plain; charset=utf-8');
            response.end('Chyba serveru');
        }

    } else {
        const filePath = `public${request.url}`;

        try {
            const content = await fs.readFile(filePath);
            response.setHeader('Content-Type', getContentType(filePath));
            response.statusCode = 200;
            response.end(content);
        } catch (error) {
            const notFound = await fs.readFile('404.html', 'utf8');
            response.statusCode = 404;
            response.setHeader('Content-Type', 'text/html; charset=utf-8')
            response.end(notFound);
        }
    }
})

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
})
