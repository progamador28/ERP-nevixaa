
const fs = require('fs');
let s = fs.readFileSync('app.js', 'utf8');

s = s.replace(/ï¾ƒã‚°/g, 'ÃO');
s = s.replace(/ï¾ƒï¿½é«\xAD/g, 'ÇÕE');
s = s.replace(/ï¾ƒï½§ï¾ƒï½£/g, 'çã');
s = s.replace(/ï¾ƒï½§/g, 'ç');
s = s.replace(/ï¾ƒï¿½ã‚°/g, 'ÇÃ');
s = s.replace(/ï¾ƒï½º/g, 'ú');
s = s.replace(/ï¾ƒï½³/g, 'ó');
s = s.replace(/ï¾ƒï½¡/g, 'á');
s = s.replace(/ï¾ƒï½£/g, 'ã');
s = s.replace(/ï¾ƒï½©/g, 'é');
s = s.replace(/ï¾ƒï½\xAD/g, 'í');
s = s.replace(/ï¾ƒï½¢/g, 'â');
s = s.replace(/ï¾ƒâ€œ/g, 'Ág');
s = s.replace(/ï¾ƒï½´/g, 'ô');
s = s.replace(/ï¾ƒï½µ/g, 'õ');
s = s.replace(/ï¾ƒãƒ½/g, 'ÁR');
s = s.replace(/ï¾ƒã€\x09/g, 'Ár'); // Wait, is it \x09 or something else? I'll use literal string
s = s.replace(/ï¾ƒã€\u3009/g, 'Ár');
s = s.replace(/ï¾ƒï½ª/g, 'ê');
s = s.replace(/ï¾ƒéŸ»/g, 'ÉC');
s = s.replace(/ç¬žï¿½ï¿½ï¿½/g, '??');
s = s.replace(/ï¿½é–¥/g, '?');
s = s.replace(/ï¾ƒè¿\xAD/g, 'ÓR');
s = s.replace(/ï¾ƒã€‚/g, 'ÁB');
s = s.replace(/ï¾ƒâ‘¯/g, 'ÇO');
s = s.replace(/ï¾ƒæ…Œ/g, 'ÍQ');
s = s.replace(/çª¶ï½¢/g, '??');
s = s.replace(/ï¾ƒåž¢/g, 'ÍC');
s = s.replace(/ï¾ƒâ‘¡/g, 'ÇA');
s = s.replace(/ï¾ƒæ•µ/g, 'ÓG');
s = s.replace(/ï¾ƒã‚\x9D/g, 'ÁT');
s = s.replace(/ï¾ƒæ³¥/g, 'ÓD');
s = s.replace(/ï¾ƒé«\xAD/g, 'ÕE');
s = s.replace(/ï¾ƒï¿½/g, 'à');
s = s.replace(/ï¾‡/g, 'Ç');

fs.writeFileSync('app.js', s);
console.log('Fixed.');

