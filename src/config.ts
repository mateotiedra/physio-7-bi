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
    supabase: {
        url: process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
        anonKey: process.env.SUPABASE_ANON_KEY || '',
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

    // Warn about Supabase config for local development
    if (!process.env.SUPABASE_ANON_KEY) {
        console.warn('SUPABASE_ANON_KEY not set, using local Supabase defaults');
    }
};

validateConfig();
