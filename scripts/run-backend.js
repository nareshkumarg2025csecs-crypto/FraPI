const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const winPython = path.join(rootDir, 'backend', '.venv', 'Scripts', 'python.exe');
const unixPython = path.join(rootDir, 'backend', '.venv', 'bin', 'python');

let pythonCmd = 'python';

if (process.platform === 'win32' && fs.existsSync(winPython)) {
  pythonCmd = winPython;
} else if (process.platform !== 'win32' && fs.existsSync(unixPython)) {
  pythonCmd = unixPython;
}

console.log(`[BACKEND SERVER] Starting uvicorn on http://127.0.0.1:8000 using Python binary: ${pythonCmd}`);

const child = spawn(pythonCmd, ['-m', 'uvicorn', 'main:app', '--reload', '--host', '127.0.0.1', '--port', '8000'], {
  cwd: path.join(rootDir, 'backend'),
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
