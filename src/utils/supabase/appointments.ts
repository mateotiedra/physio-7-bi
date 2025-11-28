import { supabase } from './client';
import { AppointmentInfo } from '../medionline/medionline.types';

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
 */
export async function insertAppointments(
    patientId: string,
    appointments: AppointmentInfo[]
): Promise<void> {
    if (appointments.length === 0) {
        return;
    }

    const dbAppointments = appointments.map((appointment) =>
        mapAppointmentToDb(patientId, appointment)
    );

    const { error } = await supabase
        .from('appointments')
        .insert(dbAppointments as any);

    if (error) {
        throw new Error(`Failed to insert appointments: ${error.message}`);
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
