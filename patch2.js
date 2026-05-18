const fs = require('fs');
const indexJsPath = '/Users/nam/Antigravity nam/backend/index.js';
let content = fs.readFileSync(indexJsPath, 'utf8');

const legacyRoutesCode = `
// ====== LEGACY FRONTEND (Chat Center / AdWeb / Time Logger / Smart Factory / Print Flow / etc) ======
app.use('/legacy', express.static(path.join(__dirname, 'public-legacy')));

const legacyRoutes = [
    '/adweb', '/time-logger', '/smart-factory', '/print-flow',
    '/virtual-office', '/settings', '/portal', '/estimator', 
    '/sales-report', '/pipeline', '/sales-analysis'
];
legacyRoutes.forEach(route => {
    app.get(route, (req, res) => {
        const legacyIndex = path.join(__dirname, 'public-legacy', 'index.html');
        if (fs.existsSync(legacyIndex)) return res.sendFile(legacyIndex);
        res.redirect('/chat');
    });
});
`;

content = content.replace(/\/\/ ====== LEGACY FRONTEND.*?res\.redirect\('\/chat'\);\n    \}\);\n\}\);/s, legacyRoutesCode.trim());
fs.writeFileSync(indexJsPath, content);
console.log('Patched index.js with all legacy routes');
