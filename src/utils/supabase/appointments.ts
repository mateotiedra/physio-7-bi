import { supabase } from './client';
import { AppointmentInfo } from '../medionline/medionline.types';
import { UpsertStats } from './supabase.types';

/**
 * Maps AppointmentInfo from scraper to database column names
 */
function mapAppointmentToDb(patientId: string, appointment: AppointmentInfo) {
    return {
        patient_id: patientId,
        date: appointment.date,
        status: appointment.status,
        duration: appointment.duration,
        event_name: appointment.eventName,
        contact: appointment.contact,
        centre: appointment.centre,
        practitioner: appointment.practitioner,
    };
}

/**
 * Insert a single appointment
 */
async function insertAppointment(patientId: string, appointment: AppointmentInfo): Promise<void> {
    const dbAppointment = mapAppointmentToDb(patientId, appointment);
    const { error } = await supabase
        .from('appointments')
        .insert(dbAppointment as any);

    if (error) {
        throw new Error(`Failed to insert appointment: ${error.message}`);
    }
}

/**
 * Upsert multiple appointments for a patient
 * Returns statistics about created, updated, and skipped appointments
 */
export async function upsertAppointments(
    patientId: string,
    appointments: AppointmentInfo[]
): Promise<UpsertStats> {
    if (appointments.length === 0) {
        return { created: 0, updated: 0, skipped: 0 };
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const appointment of appointments) {
        // Check if appointment already exists (by patient_id + date)
        let existingAppointment = null;
        if (appointment.date) {
            const { data: existing } = await supabase
                .from('appointments')
                .select('*')
                .eq('patient_id', patientId)
                .eq('date', appointment.date)
                .single();

            existingAppointment = existing;
        }

        if (existingAppointment) {
            const dbAppointment = mapAppointmentToDb(patientId, appointment);

            // Check if appointment data has changed
            const hasChanged = Object.keys(dbAppointment).some(key => {
                const existingValue = existingAppointment[key as keyof typeof existingAppointment];
                const newValue = dbAppointment[key as keyof typeof dbAppointment];
                // Compare values, treating null and undefined as equal
                return (existingValue ?? null) !== (newValue ?? null);
            });

            if (!hasChanged) {
                skipped++;
                continue;
            }

            // Update existing appointment
            const { error: updateError } = await supabase
                .from('appointments')
                .update(dbAppointment)
                .eq('id', existingAppointment.id);

            if (updateError) {
                throw new Error(`Failed to update appointment: ${updateError.message}`);
            }

            updated++;
        } else {
            // Insert new appointment
            await insertAppointment(patientId, appointment);
            created++;
        }
    }

    return { created, updated, skipped };
}

/**
 * Get all appointments for a patient
 */
export async function getAppointmentsByPatientId(patientId: string) {
    const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .order('date', { ascending: false });

    if (error) {
        throw new Error(`Failed to get appointments: ${error.message}`);
    }

    return data;
}

/**
 * Get all appointments
 */
export async function getAllAppointments() {
    const { data, error } = await supabase
        .from('appointments')
        .select('*, patients(*)')
        .order('date', { ascending: false });

    if (error) {
        throw new Error(`Failed to get appointments: ${error.message}`);
    }

    return data;
}
