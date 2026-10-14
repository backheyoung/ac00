const fs = require('fs');
const path = require('path');

const files = [
    'js/save.js',
    'js/audio.js',
    'js/particles.js',
    'js/stickman.js',
    'js/entities.js',
    'js/heroes.js',
    'js/spawner.js',
    'js/camera.js',
    'js/game.js',
    'js/main.js'
];

let bundle = '// Stickman Wars Standalone Unified Bundle\n(function() {\n';

for (const file of files) {
    let content = fs.readFileSync(path.join(__dirname, file), 'utf8');
    // Strip imports and exports
    content = content.replace(/^import\s+.*?;?\s*$/gm, '');
    content = content.replace(/^export\s+(const|class|let|function|default)\s+/gm, '$1 ');
    content = content.replace(/^export\s+\{.*?\};?\s*$/gm, '');
    bundle += `\n/* --- ${file} --- */\n` + content + '\n';
}

bundle += `
    if (typeof window !== 'undefined') {
        window.ISLANDS = ISLANDS;
        window.STAGE_CONFIGS = STAGE_CONFIGS;
        window.saveManager = saveManager;
        window.Base = Base;
        window.Hero = Hero;
        window.Game = Game;
    }
})();
`;

fs.writeFileSync(path.join(__dirname, 'js/bundle.js'), bundle, 'utf8');
console.log('Successfully re-generated js/bundle.js');

// Sync to www/ for Capacitor & APK packaging
const wwwDir = path.join(__dirname, 'www');
if (!fs.existsSync(wwwDir)) fs.mkdirSync(wwwDir, { recursive: true });
if (!fs.existsSync(path.join(wwwDir, 'css'))) fs.mkdirSync(path.join(wwwDir, 'css'), { recursive: true });
if (!fs.existsSync(path.join(wwwDir, 'js'))) fs.mkdirSync(path.join(wwwDir, 'js'), { recursive: true });

fs.copyFileSync(path.join(__dirname, 'index.html'), path.join(wwwDir, 'index.html'));
fs.copyFileSync(path.join(__dirname, 'css/style.css'), path.join(wwwDir, 'css/style.css'));
fs.copyFileSync(path.join(__dirname, 'js/bundle.js'), path.join(wwwDir, 'js/bundle.js'));
if (fs.existsSync(path.join(__dirname, 'manifest.json'))) fs.copyFileSync(path.join(__dirname, 'manifest.json'), path.join(wwwDir, 'manifest.json'));
if (fs.existsSync(path.join(__dirname, 'sw.js'))) fs.copyFileSync(path.join(__dirname, 'sw.js'), path.join(wwwDir, 'sw.js'));
console.log('Successfully synced assets to www/ for Android build');


