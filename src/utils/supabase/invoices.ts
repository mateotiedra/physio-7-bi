import { supabase } from './client';
import { InvoiceInfo, ServicesInfo } from '../medionline/medionline.types';

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
 * Insert multiple invoices with their services for a patient
 * Uses a transaction to ensure data consistency
 */
export async function insertInvoices(
    patientId: string,
    invoices: InvoiceInfo[]
): Promise<void> {
    if (invoices.length === 0) {
        return;
    }

    for (const invoice of invoices) {
        // Check if invoice already exists (by invoice_number + centre)
        if (invoice.invoiceNumber && invoice.centre) {
            const { data: existing } = await supabase
                .from('invoices')
                .select('id')
                .eq('invoice_number', invoice.invoiceNumber)
                .eq('centre', invoice.centre)
                .single();

            if (existing) {
                console.log(`Invoice ${invoice.centre} - ${invoice.invoiceNumber} already exists, skipping...`);
                continue;
            }
        }

        // Insert invoice
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
