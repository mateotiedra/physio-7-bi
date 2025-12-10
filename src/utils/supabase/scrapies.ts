import { supabase } from './client';

/**
 * Insert a scraper activity record
 */
export async function insertScrapyActivity(
    scraperId: string,
    patientId: string,
    pageIndex: number,
    rowIndex: number,
    actionType: 'created' | 'updated' | 'skipped' = 'skipped'
): Promise<void> {
    const { error } = await supabase
        .from('scrapies')
        .insert({
            scraper_id: scraperId,
            patient_id: patientId,
            page_index: pageIndex,
            row_index: rowIndex,
            action_type: actionType,
        });

    if (error) {
        throw new Error(`Failed to insert scrapy activity: ${error.message}`);
    }
}

/**
 * Get all scraper activities
 */
export async function getAllScrapyActivities() {
    const { data, error } = await supabase
        .from('scrapies')
        .select('*, patients(nom, prenom, no_avs)')
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Failed to get scrapy activities: ${error.message}`);
    }

    return data;
}

/**
 * Get scraper activities by scraper ID
 */
export async function getScrapyActivitiesByScraperId(scraperId: string) {
    const { data, error } = await supabase
        .from('scrapies')
        .select('*, patients(nom, prenom, no_avs)')
        .eq('scraper_id', scraperId)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Failed to get scrapy activities: ${error.message}`);
    }

    return data;
}

/**
 * Get the last scraped position for a scraper
 */
export async function getLastScrapedPosition(scraperId: string): Promise<{ pageIndex: number; rowIndex: number } | null> {
    const { data, error } = await supabase
        .from('scrapies')
        .select('page_index, row_index')
        .eq('scraper_id', scraperId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            // No records found
            return null;
        }
        throw new Error(`Failed to get last scraped position: ${error.message}`);
    }

    return {
        pageIndex: data.page_index,
        rowIndex: data.row_index,
    };
}
