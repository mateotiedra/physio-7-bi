import { PDFParse } from 'pdf-parse';
import { PatientInfo } from './medionline/medionline.types';


/**
 * Parse a patient info PDF and extract structured data
 */
export async function parsePatientsPdf(pdfPath: string): Promise<PatientInfo[]> {
    const parser = new PDFParse({ url: pdfPath });
    const data = await parser.getText();

    return data.pages.map(page => parsePatientText(page.text));
}

/**
 * Parse patient info from text content
 */
export function parsePatientText(text: string): PatientInfo {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);

    const patientInfo: PatientInfo = {};

    // Helper function to find value after a label (on the same line)
    const findValueInLine = (label: string): string | undefined => {
        for (const line of lines) {
            if (line.startsWith(label)) {
                const value = line.substring(label.length).trim();
                return value || undefined;
            }
        }
        return undefined;
    };

    const fieldsToExtract = {
        title: 'Titre',
        courtesyTitle: 'Titre courrier',
        adressCompl: 'Compl. adresse',
        rue: 'Rue',
        npa: 'NPA',
        localite: 'Localité',
        tel1: 'Tél. 1',
        noTel1: 'No Tél. 1',
        tel2: 'Tél. 2',
        noTel2: 'No Tél. 2',
        tel3: 'Tél. 3',
        noPatient: 'N° Patient',
        employeur: 'Employeur',
        noAvs: 'N° AVS',
        nomJeuneFille: 'Nom jeune fille',
        info: 'Info',
        nationalite: 'Nationalite',
        profession: 'Profession',
        envoyePar: 'Envoyé par',
        derniereSeance: 'Dernière séance',
        patient: 'Patient',
        deb: 'Déb.',
        ctct: 'Ctct',
        grpSanguin: 'Gr.',
        genre: 'H/F',
        etatCivil: 'Etat civil',
        noLAMAL: 'N° assuré LAMal',
        assuranceLAMAL: 'Assurance LAMal',
        noLAA: 'N° assuré LAA',
        assuranceLAA: 'Assurance LAA',
        noLCA: 'N° assuré LCA',
        assuranceLCA: 'Assurance LCA',
        noLAM: 'N° assuré LAM',
        assuranceLAM: 'Assurance LAM',
        noLAI: 'N° assuré LAI',
        assuranceLAI: 'Assurance LAI',
        coord: 'Coord.',
        langue: 'Langue',
        compte: 'Compte',
        inactif: 'Inactif',
        type: 'Type',
        noPatientPourTri: 'N°patient pour tri',
    };

    for (const [key, label] of Object.entries(fieldsToExtract)) {
        patientInfo[key as keyof PatientInfo] = findValueInLine(label);
    }

    return patientInfo;
}
