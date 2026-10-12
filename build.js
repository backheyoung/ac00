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
