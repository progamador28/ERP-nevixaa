const fs = require('fs');
let content = fs.readFileSync('app.js', 'utf8');

// Rename instance declaration
content = content.replace(/const supabase = window\.supabase\.createClient/g, 'const supabaseClient = window.supabase.createClient');

// Replace exact property accesses
content = content.replace(/supabase\.auth/g, 'supabaseClient.auth');

// Replace method chaining that has line breaks
content = content.replace(/await supabase(\s*\r?\n\s*\.from)/g, 'await supabaseClient$1');

fs.writeFileSync('app.js', content);
console.log('Fixed app.js');
