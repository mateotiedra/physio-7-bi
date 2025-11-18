import path from 'path';
import { mediOnline } from '../utils/medionline/index';
import { PatientInfo } from '../utils/pdfParser';
import { AppointmentInfo, InvoiceInfo } from '../utils/medionline/medionline.types';

async function uploadPatientsData(patients: PatientInfo[]): Promise<void> {
    // Placeholder function to simulate uploading patient data
    //console.log(`Uploading patient data : ${JSON.stringify(patients)}`);

}

async function uploadAppointmentsData(appointments: AppointmentInfo[]): Promise<void> {
    // Placeholder function to simulate uploading appointment data
    /* console.log(`Uploading ${appointments.length} appointment data:`);
    appointments.forEach(appointment => {
        console.log(JSON.stringify(appointment));
    }); */

}

async function uploadInvoicesData(invoices: InvoiceInfo[]): Promise<void> {
    // Placeholder function to simulate uploading invoice data
    console.log(`\n========== INVOICES (${invoices.length}) ==========`);
    invoices.forEach((invoice, index) => {
        console.log(`\n--- Invoice ${index + 1} ---`);
        console.log(`Patient AVS: ${invoice.patientAVS || 'N/A'}`);
        console.log(`Centre: ${invoice.centre || 'N/A'}`);
        console.log(`Date: ${invoice.date || 'N/A'}`);
        console.log(`Invoice Number: ${invoice.invoiceNumber || 'N/A'}`);
        console.log(`Reimbursement Type: ${invoice.reimbursmentType || 'N/A'}`);
        console.log(`Law: ${invoice.law || 'N/A'}`);
        console.log(`Treatment Type: ${invoice.treatmentType || 'N/A'}`);
        console.log(`Assured Card No: ${invoice.noAssuredCard || 'N/A'}`);
        console.log(`Treatment Period: ${invoice.treatmentStartDate || 'N/A'} to ${invoice.treatmentEndDate || 'N/A'}`);
        console.log(`Prestation Location: ${invoice.prestationLocation || 'N/A'}`);
        console.log(`Prescribing Doctor: ${invoice.prescribingDoctor || 'N/A'}`);
        console.log(`Doctor Address: ${invoice.prescribingDoctorAdress || 'N/A'}`);
        console.log(`Total Amount: ${invoice.totalAmount || 'N/A'}`);

        if (invoice.services && invoice.services.length > 0) {
            console.log(`\nServices (${invoice.services.length}):`);
            invoice.services.forEach((service, serviceIndex) => {
                console.log(`  [${serviceIndex + 1}] Date: ${service.date || 'N/A'}, Number: ${service.number || 'N/A'}, Position: ${service.positionNumber || 'N/A'}`);
                console.log(`      Description: ${service.description || 'N/A'}`);
                console.log(`      Unit Value: ${service.unitValue || 'N/A'}, Pt Nbr: ${service.ptNbr || 'N/A'}, Pt Value: ${service.ptValue || 'N/A'}, Amount: ${service.amount || 'N/A'}`);
            });
        } else {
            console.log(`\nServices: None`);
        }
    });
    console.log(`\n========================================\n`);
}

async function main() {
    try {
        await mediOnline.login(process.env.MEDIONLINE_USERNAME!, process.env.MEDIONLINE_PASSWORD!);
        await mediOnline.scrapePatientDashboards(uploadPatientsData, uploadAppointmentsData, uploadInvoicesData)

    } catch (error) {
        console.error('Error parsing PDF:', error);
    }
}

main();