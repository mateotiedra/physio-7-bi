import { mediOnline } from '../utils/medionline/index';
import { MediOnlineInvoicesScraperError } from '../utils/medionline/medionline.types';
import {
    uploadPatientsData,
    upsertAppointments,
    upsertInvoices,
    trackScraperActivity,
    generateScraperId,
    deletePatient,
    checkPatientExists,
} from '../utils/supabase';

// Generate a unique scraper ID for this run
const SCRAPER_ID = generateScraperId();
console.log(`Starting invoice scraper with ID: ${SCRAPER_ID}`);

async function main() {
    try {
        // Get command-line arguments: npm run scrape [mode] [pageIndex] [rowIndex]
        const args = process.argv.slice(2);
        const mode: 'all' | 'recent' = args[0] as ('all' | 'recent');
        let pageIndex = args[1] ? parseInt(args[1], 10) : 1;
        let rowIndex = args[2] ? parseInt(args[2], 10) : 0;

        await mediOnline.login(process.env.MEDIONLINE_USERNAME!, process.env.MEDIONLINE_PASSWORD!);

        let retryCount = 0;
        const maxRetries = 3;
        let lastFailedPageIndex: number = 0;
        let lastFailedRowIndex: number = 0;

        while (retryCount <= maxRetries) {
            try {
                await mediOnline.scrapeNewInvoices(
                    pageIndex,
                    rowIndex,
                    (prenom, nom, ddn) => checkPatientExists({ prenom, nom, ddn }),
                    upsertInvoices,
                );
                break; // Success, exit retry loop
            } catch (error: any) {
                if (error instanceof MediOnlineInvoicesScraperError && error.code === 'INVOICES_SCRAPER_ERROR' && retryCount < maxRetries) {
                    pageIndex = error.currPageIndex;
                    rowIndex = error.currRowIndex;

                    // Reset retry count if error is at a different position (new error)
                    if (pageIndex !== lastFailedPageIndex || rowIndex !== lastFailedRowIndex) {
                        retryCount = 0;
                        lastFailedPageIndex = pageIndex;
                        lastFailedRowIndex = rowIndex;
                    }

                    retryCount++;
                    console.error(`\n❌ Error occurred: ${error.message}`);
                    console.log(`\n🔄 Retry ${retryCount}/${maxRetries}: Restarting from page ${pageIndex}, patient ${rowIndex}\n`);

                    await mediOnline.logoutAndClose();
                    // Wait before retrying (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));

                    await mediOnline.login(process.env.MEDIONLINE_USERNAME!, process.env.MEDIONLINE_PASSWORD!);
                } else {
                    throw error; // Re-throw if max retries reached or different error
                }
            }
        }

    } catch (error) {
        console.error('Error scraping MediOnline:', error);
        process.exit(1);
    }
}

main();