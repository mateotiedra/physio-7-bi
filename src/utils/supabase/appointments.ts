import { supabase } from './client';
import { AppointmentInfo } from '../medionline/medionline.types';

/**
 * Upload appointments data - wrapper for scraper interface
 */
export async function uploadAppointmentsData(patientId: string, appointments: AppointmentInfo[]): Promise<void> {
    await insertAppointments(patientId, appointments);
    console.log(`Successfully uploaded ${appointments.length} appointments`);
}

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
 * Insert multiple appointments for a patient
 * Checks for existing appointments to prevent duplicates
 */
export async function insertAppointments(
    patientId: string,
    appointments: AppointmentInfo[]
): Promise<void> {
    if (appointments.length === 0) {
        return;
    }

    for (const appointment of appointments) {
        // Check if appointment already exists (by patient_id + date)
        if (appointment.date) {
            const { data: existing } = await supabase
                .from('appointments')
                .select('id')
                .eq('patient_id', patientId)
                .eq('date', appointment.date)
                .single();

            if (existing) {
                console.log(`Appointment for patient ${patientId} at ${appointment.date} already exists, skipping...`);
                continue;
            }
        }

        // Insert appointment
        const dbAppointment = mapAppointmentToDb(patientId, appointment);
        const { error } = await supabase
            .from('appointments')
            .insert(dbAppointment as any);

        if (error) {
            throw new Error(`Failed to insert appointment: ${error.message}`);
        }
    }
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
