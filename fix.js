const fs = require('fs');
let content = fs.readFileSync('app.js', 'utf8');

// Replace alert("message") with uiAlert("message", "warning") for all occurrences
// Note: alert(`message`) and alert('message') and alert(message) might have different types, let's just replace the word "alert" as long as it's a function call.
// But some might be "success" or "error", etc. I can use regex to replace \balert\( with uiAlert(.

content = content.replace(/\balert\(/g, 'uiAlert(');

fs.writeFileSync('app.js', content, 'utf8');
console.log('Replaced all alerts.');
