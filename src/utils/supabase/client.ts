import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';
import { Database } from './types.generated';

// Initialize Supabase client
export const supabase = createClient<Database>(
    config.supabase.url,
    config.supabase.anonKey
);
