const { exec } = require('child_process');

setTimeout(() => {
    exec('node main.js -r', (err, stdout, stderr) => {
        if (err) {
            console.error(`Error restarting main.js: ${err}`);
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });

    setTimeout(() => {
        process.exit();
    }, 2000);
}, 2000);
