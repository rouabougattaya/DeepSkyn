const { exec } = require('child_process');
const path = require('path');

const skinType = 'Dry';
const pythonPath = 'C:\\Python313\\python.exe';
const scriptPath = path.join(__dirname, 'scripts', 'recommend.py');

console.log(`Testing script at: ${scriptPath}`);

exec(`"${pythonPath}" "${scriptPath}" ${skinType}`, { cwd: __dirname }, (error, stdout, stderr) => {
  if (error) {
    console.error(`ERROR: ${error.message}`);
    console.error(`STDERR: ${stderr}`);
    return;
  }
  console.log(`STDOUT: ${stdout}`);
});
