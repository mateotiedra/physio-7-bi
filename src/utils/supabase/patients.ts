import { PatientInfo } from '../medionline/medionline.types';
import { supabase } from './client';

/**
 * Upload patients data - wrapper for scraper interface
 */
export async function uploadPatientsData(patients: PatientInfo[]): Promise<{ patientId: string; alreadyExists: boolean }> {
    if (patients.length === 0) {
        throw new Error('No patient data to upload');
    }

    const patient = patients[0];

    const alreadyExists = await checkPatientExists(patient);
    const patientId = await upsertPatient(patient);

    if (alreadyExists) {
        console.log(`Patient already exists, skipping: ${patient.nom} ${patient.prenom}`);
    } else {
        console.log(`Patient uploaded: ${`${patient.nom} ${patient.prenom} - ${patientId}` || 'N/A'}`);
    }

    return { patientId, alreadyExists };
}

/**
 * Maps PatientInfo from scraper to database column names
 */
function mapPatientToDb(patient: PatientInfo) {
    return {
        no_patient: patient.noPatient ?? null,
        no_avs: patient.noAvs ?? null,
        titre: patient.titre ?? null,
        titre_courtoisie: patient.titreCourtoisie ?? null,
        nom: patient.nom ?? null,
        prenom: patient.prenom ?? null,
        adresse_compl: patient.adressCompl ?? null,
        rue: patient.rue ?? null,
        npa: patient.npa ?? null,
        localite: patient.localite ?? null,
        tel1: patient.tel1 ?? null,
        no_tel1: patient.noTel1 ?? null,
        tel2: patient.tel2 ?? null,
        no_tel2: patient.noTel2 ?? null,
        tel3: patient.tel3 ?? null,
        no_tel3: patient.noTel3 ?? null,
        ddn: patient.ddn ?? null,
        langue: patient.langue ?? null,
        nationalite: patient.nationalite ?? null,
        date_deces: patient.dateDeces ?? null,
        employeur: patient.employeur ?? null,
        profession: patient.profession ?? null,
        etat_civil: patient.etatCivil ?? null,
        nom_jeune_fille: patient.nomJeuneFille ?? null,
        medecin_traitant: patient.medecinTraitant ?? null,
        sexe: patient.sexe ?? null,
        genre: patient.genre ?? null,
        pays: patient.pays ?? null,
        coord: patient.coord ?? null,
        email: patient.email ?? null,
        notification_sms: patient.notificationSMS ?? null,
        debiteur: patient.debiteur ?? null,
        contact: patient.contact ?? null,
        representant_legal: patient.representantLegal ?? null,
        commentaire: patient.commentaire ?? null,
    };
}

/**
 * Insert a new patient and return the UUID
 */
export async function insertPatient(patient: PatientInfo): Promise<string> {
    const dbPatient = mapPatientToDb(patient);

    try {
        const { data, error } = await supabase
            .from('patients')
            .insert(dbPatient)
            .select('id')
            .single();

        if (error) {
            console.error('Supabase insert error details:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
                fullError: error
            });
            throw new Error(`Failed to insert patient: ${error.message}`);
        }

        return data.id;
    } catch (err) {
        console.error('Network/fetch error during insert:', {
            error: err,
            errorType: err instanceof Error ? err.constructor.name : typeof err,
            errorMessage: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined
        });
        throw err;
    }
}

/**
 * Upsert a patient (update if exists, insert if not) based on the tuple (prenom, nom, ddn, no_avs)
 * Returns the patient UUID
 */
export async function upsertPatient(patient: PatientInfo): Promise<string> {
    const dbPatient = mapPatientToDb(patient);

    // Try to find existing patient by the tuple (prenom, nom, ddn, no_avs)
    let query = supabase
        .from('patients')
        .select('id');

    if (patient.prenom) {
        query = query.eq('prenom', patient.prenom);
    } else {
        query = query.is('prenom', null);
    }

    if (patient.nom) {
        query = query.eq('nom', patient.nom);
    } else {
        query = query.is('nom', null);
    }

    if (patient.ddn) {
        query = query.eq('ddn', patient.ddn);
    } else {
        query = query.is('ddn', null);
    }

    if (patient.noAvs) {
        query = query.eq('no_avs', patient.noAvs);
    } else {
        query = query.is('no_avs', null);
    }

    const { data: existingPatient, error: queryError } = await query.single();

    if (queryError && queryError.code !== 'PGRST116') {
        console.error('Supabase query error details:', {
            message: queryError.message,
            code: queryError.code,
            details: queryError.details,
            hint: queryError.hint,
            fullError: queryError
        });
        throw new Error(`Failed to query patient: ${queryError.message}`);
    }

    if (existingPatient) {
        // Patient already exists, return existing ID
        return existingPatient.id;
    } else {
        // Insert new patient
        return await insertPatient(patient);
    }
}

/**
 * Check if a patient already exists based on the tuple (prenom, nom, ddn, no_avs)
 * Returns true if patient exists, false otherwise
 */
export async function checkPatientExists(patient: PatientInfo): Promise<boolean> {
    // Try to find existing patient by the tuple (prenom, nom, ddn, no_avs)
    let query = supabase
        .from('patients')
        .select('id');

    if (patient.prenom) {
        query = query.eq('prenom', patient.prenom);
    } else {
        query = query.is('prenom', null);
    }

    if (patient.nom) {
        query = query.eq('nom', patient.nom);
    } else {
        query = query.is('nom', null);
    }

    if (patient.ddn) {
        query = query.eq('ddn', patient.ddn);
    } else {
        query = query.is('ddn', null);
    }

    if (patient.noAvs) {
        query = query.eq('no_avs', patient.noAvs);
    } else {
        query = query.is('no_avs', null);
    }

    const { data: existingPatient, error: queryError } = await query.single();

    if (queryError && queryError.code !== 'PGRST116') {
        console.error('Supabase query error details:', {
            message: queryError.message,
            code: queryError.code,
            details: queryError.details,
            hint: queryError.hint,
            fullError: queryError
        });
        throw new Error(`Failed to query patient: ${queryError.message}`);
    }

    return !!existingPatient;
}

/**
 * Get a patient by ID
 */
export async function getPatientById(id: string) {
    const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        throw new Error(`Failed to get patient: ${error.message}`);
    }

    return data;
}

/**
 * Get all patients
 */
export async function getAllPatients() {
    const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Failed to get patients: ${error.message}`);
    }

    return data;
}
