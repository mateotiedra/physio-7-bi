import { parsePatientPdf } from './utils/pdfParser';
import path from 'path';

async function main() {
    const pdfPath = path.join(__dirname, '../export-patient-info.pdf');

    console.log('Parsing PDF:', pdfPath);
    console.log('---');

    try {
        const patientInfo = await parsePatientPdf(pdfPath);

        console.log('Patient Information:');
        console.log(JSON.stringify(patientInfo, null, 2));

        // Example: Access specific fields
        console.log('\n--- Quick Access ---');
        console.log('Address:', patientInfo.rue, patientInfo.npa, patientInfo.localite);
        console.log('Birth Date:', patientInfo.dob);
        console.log('AVS Number:', patientInfo.noAvs);
        console.log('Insurance (LAMal):', patientInfo.assuranceLAMAL);
        console.log('Account Number:', patientInfo.compte);

    } catch (error) {
        console.error('Error parsing PDF:', error);
    }
}

main();
