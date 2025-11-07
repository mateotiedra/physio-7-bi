import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

export const config = {
    medionline: {
        username: process.env.MEDIONLINE_USERNAME,
        password: process.env.MEDIONLINE_PASSWORD,
        url: 'https://www.medionline.ch/MediOnlineNet',
    },
};

// Validate required environment variables
const validateConfig = () => {
    const required = ['MEDIONLINE_USERNAME', 'MEDIONLINE_PASSWORD'];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(', ')}\n` +
            'Please create a .env.local file based on .env.template'
        );
    }
};

validateConfig();
