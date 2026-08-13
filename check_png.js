const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\Sr Monteiro\\.gemini\\antigravity\\brain\\f79f63aa-1534-4283-a470-39b435639a00\\.user_uploaded';

fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.png')) {
        const filePath = path.join(dir, file);
        const buffer = Buffer.alloc(24);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buffer, 0, 24, 0);
        fs.closeSync(fd);
        
        if (buffer.toString('ascii', 1, 4) === 'PNG') {
            const width = buffer.readUInt32BE(16);
            const height = buffer.readUInt32BE(20);
            const mtime = fs.statSync(filePath).mtime;
            if (mtime.getTime() > Date.now() - 3 * 60 * 60 * 1000) { // last 3 hours
                console.log(`${file}: ${width}x${height} - Size: ${fs.statSync(filePath).size}`);
            }
        }
    }
});
