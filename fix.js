
const fs = require('fs');
const currStr = fs.readFileSync('app.js', 'utf8');
const oldStr = require('child_process').execSync('git show 901c03e:app.js').toString('latin1'); // Old was Windows-1252

// Find the corrupted substrings in currStr. Usually they start with ï.
let badPattern = /[^\x00-\x7F]+/g;
let matches = currStr.match(badPattern);
if (matches) {
    let unique = Array.from(new Set(matches)).filter(m => m.includes('ï') || m.includes('ã') || m.includes('é'));
    for (let bad of unique) {
        let idx = currStr.indexOf(bad);
        let ctx = currStr.substring(Math.max(0, idx - 15), Math.min(currStr.length, idx + bad.length + 15)).replace(/\n/g, ' ');
        console.log(bad + '  ==>  ' + ctx);
    }
}

