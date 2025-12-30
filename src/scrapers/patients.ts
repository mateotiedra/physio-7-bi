import { mediOnline } from '../utils/medionline/index';
import {
    uploadPatientsData,
    upsertAppointments,
    upsertInvoices,
    trackScraperActivity,
    generateScraperId,
    deletePatient
} from '../utils/supabase';

// Generate a unique scraper ID for this run
const SCRAPER_ID = generateScraperId();
console.log(`Starting scraper with ID: ${SCRAPER_ID}`);

async function main() {
    try {
        // Get command-line arguments: npm run scrape [mode] [pageIndex] [patientIndex]
        const args = process.argv.slice(2);
        const mode: 'all' | 'recent' = args[0] as ('all' | 'recent');
        let pageIndex = args[1] ? parseInt(args[1], 10) : 1;
        let patientIndex = args[2] ? parseInt(args[2], 10) : 0;

        await mediOnline.login(process.env.MEDIONLINE_USERNAME!, process.env.MEDIONLINE_PASSWORD!);

        let retryCount = 0;
        const maxRetries = 3;
        let lastFailedPageIndex: number = 0;
        let lastFailedPatientIndex: number = 0;


        while (retryCount <= maxRetries) {
            try {
                if (mode === 'all') {
                    await mediOnline.setSearchParams({});
                } else {
                    const threeDaysAgo = new Date();
                    threeDaysAgo.setDate(threeDaysAgo.getDate() - 1);
                    await mediOnline.setSearchParams({ advancedOptions: { lastModifiedStartDate: threeDaysAgo } });
                }
                await mediOnline.scrapeSearchedPatients(
                    pageIndex,
                    patientIndex,
                    {
                        patients: uploadPatientsData,
                        appointments: upsertAppointments,
                        invoices: upsertInvoices,
                        scraperActivity: trackScraperActivity,
                        deletePatient: deletePatient,
                    }
                );
                break; // Success, exit retry loop
            } catch (error: any) {
                if (error.code === 'PATIENTS_SCRAPER_ERROR' && retryCount < maxRetries) {
                    pageIndex = error.currPageIndex;
                    patientIndex = error.currPatientIndex;

                    // Reset retry count if error is at a different position (new error)
                    if (pageIndex !== lastFailedPageIndex || patientIndex !== lastFailedPatientIndex) {
                        retryCount = 0;
                        lastFailedPageIndex = pageIndex;
                        lastFailedPatientIndex = patientIndex;
                    }

                    retryCount++;
                    console.error(`\n❌ Error occurred: ${error.message}`);
                    console.log(`\n🔄 Retry ${retryCount}/${maxRetries}: Restarting from page ${pageIndex}, patient ${patientIndex}\n`);

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