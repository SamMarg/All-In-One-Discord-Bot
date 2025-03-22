const { exec } = require('child_process');

setTimeout(() => {
    // Run main.js with the -r flag
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

    // Wait another 2 seconds before exiting
    setTimeout(() => {
        process.exit();
    }, 2000);  // Wait for 2 seconds before exiting
}, 2000);