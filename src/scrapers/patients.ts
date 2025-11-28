import { mediOnline } from '../utils/medionline/index';
import { AppointmentInfo, InvoiceInfo, PatientInfo } from '../utils/medionline/medionline.types';
import { upsertPatient, insertAppointments, insertInvoices } from '../utils/supabase';

async function uploadPatientsData(patients: PatientInfo[]): Promise<string> {
    if (patients.length === 0) {
        throw new Error('No patient data to upload');
    }

    const patient = patients[0];
    console.log(`Uploading patient: ${patient.noPatient || 'N/A'}`);

    const patientId = await upsertPatient(patient);
    console.log(`Patient uploaded with ID: ${patientId}`);

    return patientId;
}

async function uploadAppointmentsData(patientId: string, appointments: AppointmentInfo[]): Promise<void> {
    console.log(`Uploading ${appointments.length} appointments for patient ${patientId}`);

    await insertAppointments(patientId, appointments);
    console.log(`Successfully uploaded ${appointments.length} appointments`);
}

async function uploadInvoicesData(patientId: string, invoices: InvoiceInfo[]): Promise<void> {
    console.log(`\n========== UPLOADING ${invoices.length} INVOICES ==========`);

    await insertInvoices(patientId, invoices);
    console.log(`Successfully uploaded ${invoices.length} invoices with their services`);
    console.log(`========================================\n`);
}

async function main() {
    try {
        await mediOnline.login(process.env.MEDIONLINE_USERNAME!, process.env.MEDIONLINE_PASSWORD!);
        await mediOnline.scrapePatientDashboards(uploadPatientsData, uploadAppointmentsData, uploadInvoicesData)

    } catch (error) {
        console.error('Error scraping MediOnline:', error);
    }
}

main();