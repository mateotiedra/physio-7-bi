import { PatientInfo } from '../medionline/medionline.types';
import { supabase } from './client';


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
        dob: patient.dob ?? null,
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

    const { data, error } = await supabase
        .from('patients')
        .insert(dbPatient)
        .select('id')
        .single();

    if (error) {
        throw new Error(`Failed to insert patient: ${error.message}`);
    }

    return data.id;
}

/**
 * Upsert a patient (update if exists, insert if not) based on no_avs or no_patient
 * Returns the patient UUID
 */
export async function upsertPatient(patient: PatientInfo): Promise<string> {
    const dbPatient = mapPatientToDb(patient);

    // Try to find existing patient by no_avs or no_patient
    let existingPatient = null;

    if (patient.noAvs) {
        const { data } = await supabase
            .from('patients')
            .select('id')
            .eq('no_avs', patient.noAvs)
            .single();
        existingPatient = data;
    }

    if (!existingPatient && patient.noPatient) {
        const { data } = await supabase
            .from('patients')
            .select('id')
            .eq('no_patient', patient.noPatient)
            .single();
        existingPatient = data;
    }

    if (existingPatient) {
        // Update existing patient
        const { error } = await supabase
            .from('patients')
            .update(dbPatient)
            .eq('id', existingPatient.id);

        if (error) {
            throw new Error(`Failed to update patient: ${error.message}`);
        }

        return existingPatient.id;
    } else {
        // Insert new patient
        return await insertPatient(patient);
    }
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
