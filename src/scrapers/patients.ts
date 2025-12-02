import { mediOnline } from '../utils/medionline/index';
import { AppointmentInfo, InvoiceInfo, PatientInfo } from '../utils/medionline/medionline.types';
import { upsertPatient, insertAppointments, insertInvoices } from '../utils/supabase';

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

async function main() {
    try {
        await mediOnline.login(process.env.MEDIONLINE_USERNAME!, process.env.MEDIONLINE_PASSWORD!);
        await mediOnline.scrapePatientDashboards(uploadPatientsData, uploadAppointmentsData, uploadInvoicesData)

    } catch (error) {
        console.error('Error scraping MediOnline:', error);
    }
}

main();