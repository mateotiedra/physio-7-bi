import path from 'path';
import { mediOnline } from '../utils/medionline/index';
import { PatientInfo } from '../utils/pdfParser';

async function uploadPatientsData(patients: PatientInfo[]): Promise<void> {
    // Placeholder function to simulate uploading patient data
}

async function main() {
    try {
        await mediOnline.login(process.env.MEDIONLINE_USERNAME!, process.env.MEDIONLINE_PASSWORD!);
        await mediOnline.scrapePatients(uploadPatientsData)

    } catch (error) {
        console.error('Error parsing PDF:', error);
    }
}

main();