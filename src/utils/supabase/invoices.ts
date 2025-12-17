import { supabase } from './client';
import { InvoiceInfo, ServicesInfo } from '../medionline/medionline.types';

/**
 * Upload invoices data - wrapper for scraper interface
 */
export async function uploadInvoicesData(patientId: string, invoices: InvoiceInfo[]): Promise<void> {
    const { created, updated, skipped } = await upsertInvoices(patientId, invoices);
    console.log(`Invoices: ${created} created, ${updated} updated, ${skipped} skipped (total: ${invoices.length})`);
}

/**
 * Maps InvoiceInfo from scraper to database column names
 */
function mapInvoiceToDb(patientId: string, invoice: InvoiceInfo) {
    return {
        patient_id: patientId,
        patient_avs: invoice.patientAVS ?? null,
        centre: invoice.centre ?? null,
        date: invoice.date ?? null,
        invoice_number: invoice.invoiceNumber ?? null,
        no_assured_person: invoice.noAssuredPerson ?? null,
        reimbursment_type: invoice.reimbursmentType ?? null,
        law: invoice.law ?? null,
        treatment_type: invoice.treatmentType ?? null,
        no_assured_card: invoice.noAssuredCard ?? null,
        treatment_start_date: invoice.treatmentStartDate ?? null,
        treatment_end_date: invoice.treatmentEndDate ?? null,
        prestation_location: invoice.prestationLocation ?? null,
        prescribing_doctor: invoice.prescribingDoctor ?? null,
        prescribing_doctor_address: invoice.prescribingDoctorAdress ?? null,
        case_date: invoice.caseDate ?? null,
        decision_number: invoice.decisionNumber ?? null,
        total_amount: invoice.totalAmount ?? null,
        status: invoice.status ?? null,
    };
}

/**
 * Maps ServicesInfo from scraper to database column names
 */
function mapServiceToDb(invoiceId: string, service: ServicesInfo) {
    return {
        invoice_id: invoiceId,
        date: service.date ?? null,
        number: service.number ?? null,
        position_number: service.positionNumber ?? null,
        description: service.description ?? null,
        unit_value: service.unitValue ?? null,
        pt_nbr: service.ptNbr ?? null,
        pt_value: service.ptValue ?? null,
        amount: service.amount ?? null,
    };
}

/**
 * Insert a single invoice with its services
 */
async function insertInvoice(patientId: string, invoice: InvoiceInfo): Promise<void> {
    const dbInvoice = mapInvoiceToDb(patientId, invoice);
    const { data: insertedInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert(dbInvoice)
        .select('id')
        .single();

    if (invoiceError) {
        throw new Error(`Failed to insert invoice: ${invoiceError.message}`);
    }

    // Insert services for this invoice
    if (invoice.services && invoice.services.length > 0) {
        const dbServices = invoice.services.map((service) =>
            mapServiceToDb(insertedInvoice.id, service)
        );

        const { error: servicesError } = await supabase
            .from('services')
            .insert(dbServices);

        if (servicesError) {
            throw new Error(`Failed to insert services: ${servicesError.message}`);
        }
    }
}

/**
 * Upsert multiple invoices with their services for a patient
 * Returns statistics about created, updated, and skipped invoices
 */
export async function upsertInvoices(
    patientId: string,
    invoices: InvoiceInfo[]
): Promise<{ created: number; updated: number; skipped: number }> {
    if (invoices.length === 0) {
        return { created: 0, updated: 0, skipped: 0 };
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const invoice of invoices) {
        // Check if invoice already exists (by invoice_number + centre)
        let existingInvoice = null;
        if (invoice.invoiceNumber && invoice.centre) {
            const { data: existing } = await supabase
                .from('invoices')
                .select('*')
                .eq('invoice_number', invoice.invoiceNumber)
                .eq('centre', invoice.centre)
                .single();

            existingInvoice = existing;
        }

        if (existingInvoice) {
            const dbInvoice = mapInvoiceToDb(patientId, invoice);

            // Check if invoice data has changed
            const hasChanged = Object.keys(dbInvoice).some(key => {
                const existingValue = existingInvoice[key as keyof typeof existingInvoice];
                const newValue = dbInvoice[key as keyof typeof dbInvoice];
                // Compare values, treating null and undefined as equal
                return (existingValue ?? null) !== (newValue ?? null);
            });

            if (!hasChanged) {
                console.log(`Invoice ${invoice.centre} - ${invoice.invoiceNumber} is up to date, skipping...`);
                skipped++;
                continue;
            }

            // Update existing invoice
            const { error: updateError } = await supabase
                .from('invoices')
                .update(dbInvoice)
                .eq('id', existingInvoice.id);

            if (updateError) {
                throw new Error(`Failed to update invoice: ${updateError.message}`);
            }

            console.log(`Invoice ${invoice.centre} - ${invoice.invoiceNumber} updated`);
            updated++;

            // Update services for this invoice
            if (invoice.services && invoice.services.length > 0) {
                // Delete existing services
                await supabase
                    .from('services')
                    .delete()
                    .eq('invoice_id', existingInvoice.id);

                // Insert new services
                const dbServices = invoice.services.map((service) =>
                    mapServiceToDb(existingInvoice.id, service)
                );

                const { error: servicesError } = await supabase
                    .from('services')
                    .insert(dbServices);

                if (servicesError) {
                    throw new Error(`Failed to insert services: ${servicesError.message}`);
                }
            }
        } else {
            // Insert new invoice
            await insertInvoice(patientId, invoice);
            created++;
        }
    }

    return { created, updated, skipped };
}

/**
 * Get all invoices for a patient
 */
export async function getInvoicesByPatientId(patientId: string) {
    const { data, error } = await supabase
        .from('invoices')
        .select('*, services(*)')
        .eq('patient_id', patientId)
        .order('date', { ascending: false });

    if (error) {
        throw new Error(`Failed to get invoices: ${error.message}`);
    }

    return data;
}

/**
 * Get all invoices
 */
export async function getAllInvoices() {
    const { data, error } = await supabase
        .from('invoices')
        .select('*, patients(*), services(*)')
        .order('date', { ascending: false });

    if (error) {
        throw new Error(`Failed to get invoices: ${error.message}`);
    }

    return data;
}

/**
 * Get a single invoice by ID with its services
 */
export async function getInvoiceById(id: string) {
    const { data, error } = await supabase
        .from('invoices')
        .select('*, services(*)')
        .eq('id', id)
        .single();

    if (error) {
        throw new Error(`Failed to get invoice: ${error.message}`);
    }

    return data;
}
