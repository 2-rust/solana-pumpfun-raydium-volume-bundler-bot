import chalk from 'chalk';
import signIn from './login.js';

async function createPumpProfiles() {
    await signIn();
    console.log(chalk.green('Completed sign-in process.'));
}

export default createPumpProfiles;
