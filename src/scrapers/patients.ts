import path from 'path';
import { mediOnline } from '../utils/medionline/index';
import { PatientInfo } from '../utils/pdfParser';
import { AppointmentInfo } from '../utils/medionline/medionline.types';

async function uploadPatientsData(patients: PatientInfo[]): Promise<void> {
    // Placeholder function to simulate uploading patient data
    console.log(`Uploading patient data : ${JSON.stringify(patients)}`);

}

async function uploadAppointmentsData(appointments: AppointmentInfo[]): Promise<void> {
    // Placeholder function to simulate uploading appointment data
    console.log(`Uploading ${appointments.length} appointment data:`);
    appointments.forEach(appointment => {
        console.log(JSON.stringify(appointment));
    });

}

async function main() {
    try {
        await mediOnline.login(process.env.MEDIONLINE_USERNAME!, process.env.MEDIONLINE_PASSWORD!);
        await mediOnline.scrapePatientDashboards(uploadPatientsData, uploadAppointmentsData)

    } catch (error) {
        console.error('Error parsing PDF:', error);
    }
}

main();