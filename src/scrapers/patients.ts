import { mediOnline } from '../utils/medionline/index';
import { AppointmentInfo, InvoiceInfo, PatientInfo } from '../utils/medionline/medionline.types';
import { upsertPatient, insertAppointments, insertInvoices, insertScrapyActivity } from '../utils/supabase';
import { randomUUID } from 'crypto';

// Generate a unique scraper ID for this run
const SCRAPER_ID = randomUUID();

async function uploadPatientsData(patients: PatientInfo[]): Promise<string> {
    if (patients.length === 0) {
        throw new Error('No patient data to upload');
    }

    const patient = patients[0];

    const patientId = await upsertPatient(patient);
    console.log(`Patient uploaded: ${`${patient.nom} ${patient.prenom} - ${patientId}` || 'N/A'}`);

    return patientId;
}

async function uploadAppointmentsData(patientId: string, appointments: AppointmentInfo[]): Promise<void> {
    await insertAppointments(patientId, appointments);
    console.log(`Successfully uploaded ${appointments.length} appointments`);
}

async function uploadInvoicesData(patientId: string, invoices: InvoiceInfo[]): Promise<void> {
    await insertInvoices(patientId, invoices);
    console.log(`Successfully uploaded ${invoices.length} invoices with their services`);
}

async function trackScraperActivity(patientId: string, pageIndex: number, rowIndex: number): Promise<void> {
    await insertScrapyActivity(SCRAPER_ID, patientId, pageIndex, rowIndex);
    console.log(`Tracked scraper activity: page ${pageIndex}, row ${rowIndex}`);
}

async function main() {
    try {
        // Get command-line arguments: npm run scrape [pageIndex] [patientIndex]
        const args = process.argv.slice(2);
        let pageIndex = args[0] ? parseInt(args[0], 10) : undefined;
        let patientIndex = args[1] ? parseInt(args[1], 10) : undefined;

        await mediOnline.login(process.env.MEDIONLINE_USERNAME!, process.env.MEDIONLINE_PASSWORD!);

        let retryCount = 0;
        const maxRetries = 3;
        let lastFailedPageIndex: number | undefined;
        let lastFailedPatientIndex: number | undefined;

        while (retryCount <= maxRetries) {
            try {
                await mediOnline.scrapePatientDashboards(
                    uploadPatientsData,
                    uploadAppointmentsData,
                    uploadInvoicesData,
                    trackScraperActivity,
                    pageIndex,
                    patientIndex
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