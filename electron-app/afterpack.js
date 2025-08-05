// afterPack.js
const { execSync } = require('child_process');
const path = require('path');

exports.default = async function(context) {
    const backendDir = path.join(context.appOutDir, 'resources', 'backend');
    console.log(`\n\n[afterPack] Installing production dependencies for backend in: ${backendDir}\n\n`);
    
    // Using execSync for simplicity, but you can use async exec
    execSync('npm install --production', {
        cwd: backendDir,
        stdio: 'inherit' // This will show the output of npm install in your terminal
    });
};