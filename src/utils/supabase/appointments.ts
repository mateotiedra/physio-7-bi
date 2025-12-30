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
 * Check if appointment data has changed
 */
function hasAppointmentChanged(existing: any, newData: any): boolean {
    return Object.keys(newData).some(key => {
        const existingValue = existing[key as keyof typeof existing];
        const newValue = newData[key as keyof typeof newData];
        // Compare values, treating null and undefined as equal
        return (existingValue ?? null) !== (newValue ?? null);
    });
}

/**
 * Upsert multiple appointments for a patient using a hybrid matching approach
 * 
 * Returns statistics about created, updated, skipped, and deleted appointments
 * 
 * Algorithm:
 * 1. Fetch all non-deleted existing appointments for the patient
 * 2. Partition appointments into past (immutable) and future (mutable)
 * 3. For past appointments: use exact date matching only
 * 4. For future appointments:
 *    a. First pass: exact date matching
 *    b. Second pass: positional matching for unmatched appointments
 *    c. Soft delete unmatched old appointments, insert unmatched new ones
 * 
 * Limitations:
 * - Date swaps between appointments may cause misidentification
 * - Multiple appointments on same day may match incorrectly
 * - These are acceptable trade-offs as most patients have consistent practitioners/events
 */
export async function upsertAppointments(
    patientId: string,
    appointments: AppointmentInfo[]
): Promise<UpsertStats> {
    if (appointments.length === 0) {
        return { created: 0, updated: 0, skipped: 0, deleted: 0 };
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let deleted = 0;

    // Get today's date at midnight for past/future partition
    const today = new Date().toISOString().split('T')[0];

    // Fetch all non-deleted existing appointments for this patient
    const { data: existingAppointments, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .is('deleted_at', null);

    if (fetchError) {
        throw new Error(`Failed to fetch existing appointments: ${fetchError.message}`);
    }

    const existing = existingAppointments || [];

    // Partition appointments into past and future
    const pastExisting = existing.filter(apt => apt.date && apt.date < today);
    const futureExisting = existing.filter(apt => apt.date && apt.date >= today);
    const pastNew = appointments.filter(apt => apt.date && apt.date < today);
    const futureNew = appointments.filter(apt => apt.date && apt.date >= today);

    // console.log('Past existing', futureExisting);
    // console.log('New existing', futureNew);

    // Track which appointments have been matched
    const matchedExistingIds = new Set<string>();
    const matchedPastNew = new Set<number>();
    const matchedFutureNew = new Set<number>();

    // Track dates we've seen in the new data to detect duplicates
    const seenDatesInPastNew = new Set<string>();
    const seenDatesInFutureNew = new Set<string>();

    // ============================================
    // PROCESS PAST APPOINTMENTS (exact date only)
    // ============================================
    for (let i = 0; i < pastNew.length; i++) {
        const newApt = pastNew[i];

        // Skip appointments without dates or with duplicate dates in scraped data
        if (!newApt.date) {
            matchedPastNew.add(i); // Mark as matched so we don't try to insert it
            continue;
        }

        if (seenDatesInPastNew.has(newApt.date)) {
            // Duplicate date in scraped data - skip the duplicate
            matchedPastNew.add(i);
            skipped++;
            continue;
        }
        seenDatesInPastNew.add(newApt.date);

        // Try exact date match
        const existingMatch = pastExisting.find(
            ex => ex.date === newApt.date && !matchedExistingIds.has(ex.id)
        );

        if (existingMatch) {
            matchedExistingIds.add(existingMatch.id);
            matchedPastNew.add(i);

            const dbAppointment = mapAppointmentToDb(patientId, newApt);

            if (!hasAppointmentChanged(existingMatch, dbAppointment)) {
                skipped++;
            } else {
                const { error: updateError } = await supabase
                    .from('appointments')
                    .update(dbAppointment)
                    .eq('id', existingMatch.id);

                if (updateError) {
                    throw new Error(`Failed to update past appointment: ${updateError.message}`);
                }
                updated++;
            }
        } else {
            // Past appointment not found - edge case, but insert it
            await insertAppointment(patientId, newApt);
            matchedPastNew.add(i);
            created++;
        }
    }

    // ============================================
    // PROCESS FUTURE APPOINTMENTS
    // ============================================

    // FIRST PASS: Exact date matching
    for (let i = 0; i < futureNew.length; i++) {
        const newApt = futureNew[i];

        // Skip appointments without dates
        if (!newApt.date) {
            matchedFutureNew.add(i); // Mark as matched so we don't try to insert it
            continue;
        }

        // Skip if already matched or duplicate date in scraped data
        if (matchedFutureNew.has(i)) continue;

        if (seenDatesInFutureNew.has(newApt.date)) {
            // Duplicate date in scraped data - skip the duplicate
            matchedFutureNew.add(i);
            skipped++;
            continue;
        }
        seenDatesInFutureNew.add(newApt.date);

        // Try exact date match
        const existingMatch = futureExisting.find(
            ex => ex.date === newApt.date && !matchedExistingIds.has(ex.id)
        );

        if (existingMatch) {
            matchedExistingIds.add(existingMatch.id);
            matchedFutureNew.add(i);

            const dbAppointment = mapAppointmentToDb(patientId, newApt);

            if (!hasAppointmentChanged(existingMatch, dbAppointment)) {
                skipped++;
            } else {
                const { error: updateError } = await supabase
                    .from('appointments')
                    .update(dbAppointment)
                    .eq('id', existingMatch.id);

                if (updateError) {
                    throw new Error(`Failed to update future appointment: ${updateError.message}`);
                }
                updated++;
            }
        }
    }

    // SECOND PASS: Positional matching for unmatched appointments
    const unmatchedExisting = futureExisting
        .filter(ex => !matchedExistingIds.has(ex.id))
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    const unmatchedNewWithIndices = futureNew
        .map((apt, idx) => ({ apt, originalIndex: idx }))
        .filter(({ originalIndex }) => !matchedFutureNew.has(originalIndex))
        .sort((a, b) => (a.apt.date || '').localeCompare(b.apt.date || ''));

    const matchCount = Math.min(unmatchedExisting.length, unmatchedNewWithIndices.length);

    for (let i = 0; i < matchCount; i++) {
        const existingMatch = unmatchedExisting[i];
        const { apt: newApt, originalIndex } = unmatchedNewWithIndices[i];

        matchedExistingIds.add(existingMatch.id);
        matchedFutureNew.add(originalIndex);

        const dbAppointment = mapAppointmentToDb(patientId, newApt);

        if (hasAppointmentChanged(existingMatch, dbAppointment)) {
            const { error: updateError } = await supabase
                .from('appointments')
                .update(dbAppointment)
                .eq('id', existingMatch.id);

            if (updateError) {
                throw new Error(`Failed to update matched appointment: ${updateError.message}`);
            }
            updated++;
        } else {
            skipped++;
        }
    }

    // CLEANUP: Soft delete unmatched existing future appointments
    for (const ex of futureExisting) {
        if (!matchedExistingIds.has(ex.id)) {
            const { error: deleteError } = await supabase
                .from('appointments')
                .update({ deleted_at: new Date().toISOString() } as any)
                .eq('id', ex.id);

            if (deleteError) {
                throw new Error(`Failed to soft delete appointment: ${deleteError.message}`);
            }
            deleted++;
        }
    }

    // INSERT: Unmatched new appointments
    // Process past appointments
    for (let i = 0; i < pastNew.length; i++) {
        if (!matchedPastNew.has(i)) {
            await insertAppointment(patientId, pastNew[i]);
            created++;
        }
    }

    // Process future appointments
    for (let i = 0; i < futureNew.length; i++) {
        if (!matchedFutureNew.has(i)) {
            await insertAppointment(patientId, futureNew[i]);
            created++;
        }
    }

    return { created, updated, skipped, deleted };
}

/**
 * Get all appointments for a patient (excluding soft-deleted)
 */
export async function getAppointmentsByPatientId(patientId: string) {
    const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .is('deleted_at', null)
        .order('date', { ascending: false });

    if (error) {
        throw new Error(`Failed to get appointments: ${error.message}`);
    }

    return data;
}

/**
 * Get all appointments (excluding soft-deleted)
 */
export async function getAllAppointments() {
    const { data, error } = await supabase
        .from('appointments')
        .select('*, patients(*)')
        .is('deleted_at', null)
        .order('date', { ascending: false });

    if (error) {
        throw new Error(`Failed to get appointments: ${error.message}`);
    }

    return data;
}

/**
 * Get deleted appointments for a patient (for historical analysis)
 */
export async function getDeletedAppointments(patientId: string) {
    const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

    if (error) {
        throw new Error(`Failed to get deleted appointments: ${error.message}`);
    }

    return data;
}
