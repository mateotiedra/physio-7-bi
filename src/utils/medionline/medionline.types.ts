/* =============== MediOnline Errors =============== */

/**
 * Base error class for MediOnline operations
 */
export class MediOnlineError extends Error {
    constructor(message: string, public readonly code: string) {
        super(message);
        this.name = 'MediOnlineError';
        Object.setPrototypeOf(this, MediOnlineError.prototype);
    }
}

/**
 * Error thrown when MediOnline credentials are missing or invalid
 */
export class MediOnlineCredentialsError extends MediOnlineError {
    constructor(message: string = 'MediOnline credentials not found in storage. Please configure them in settings.') {
        super(message, 'CREDENTIALS_ERROR');
        this.name = 'MediOnlineCredentialsError';
        Object.setPrototypeOf(this, MediOnlineCredentialsError.prototype);
    }
}

export class MediOnlineSelectOptionNotFoundError extends MediOnlineError {
    constructor(message: string) {
        super(message, 'SELECT_OPTION_NOT_FOUND');
        this.name = 'MediOnlineSelectOptionNotFoundError';
        Object.setPrototypeOf(this, MediOnlineSelectOptionNotFoundError.prototype);
    }
}

/**
 * Error thrown when login to MediOnline fails
 */
export class MediOnlineLoginError extends MediOnlineError {
    constructor(message: string) {
        super(message, 'LOGIN_ERROR');
        this.name = 'MediOnlineLoginError';
        Object.setPrototypeOf(this, MediOnlineLoginError.prototype);
    }
}

export enum CreateTreatmentSteps {
    OPEN_PATIENT_DASHBOARD = 'de la recherche du patient',
    OPEN_TREATMENT = 'de la création du traitement',
    OPEN_TREATMENT_INFOS = 'de l\'ouverture des informations du traitement',
    ADD_DOCTOR_INFO = 'de la recherche et l\'ajout du médecin',
    UPLOAD_VOUCHER = 'de l\'upload du scan du bon',
    NONE = 'terminée',
    UNKNOWN = 'd\'une étape inconnue'
}

export class MediOnlineCreateTreatmentStepError extends MediOnlineError {
    public readonly step: CreateTreatmentSteps;

    constructor(step: CreateTreatmentSteps = CreateTreatmentSteps.UNKNOWN, message: string) {
        super(`Erreur lors ${step}: ${message.charAt(0).toLowerCase() + message.slice(1)}`, 'UPLOAD_VOUCHER_STEP_ERROR');
        this.name = 'MediOnlineCreateTreatmentStepError';
        this.step = step;
        Object.setPrototypeOf(this, MediOnlineCreateTreatmentStepError.prototype);
    }
}

export class MediOnlineCreateTreatmentUnknownError extends MediOnlineCreateTreatmentStepError {
    constructor(message: string = 'Une erreur inconnue est survenue.') {
        super(CreateTreatmentSteps.UNKNOWN, message);
        this.name = 'MediOnlineCreateTreatmentUnknownError';
        Object.setPrototypeOf(this, MediOnlineCreateTreatmentUnknownError.prototype);
    }
}

export class MediOnlineCreateTreatmentRequestError extends MediOnlineCreateTreatmentStepError {
    constructor(message: string = 'Erreur lors de la création du traitement.') {
        super(CreateTreatmentSteps.OPEN_PATIENT_DASHBOARD, message);
        this.name = 'MediOnlineCreateTreatmentRequestError';
        Object.setPrototypeOf(this, MediOnlineCreateTreatmentRequestError.prototype);
    }
}

/**
 * Error thrown when patient is not found in search
 */
export class MediOnlinePatientNotFoundError extends MediOnlineCreateTreatmentStepError {
    constructor(message: string = 'Aucun patient trouvé avec les critères fournis. Veuillez vérifier le nom, prénom et date de naissance.') {
        super(CreateTreatmentSteps.OPEN_PATIENT_DASHBOARD, message);
        this.name = 'MediOnlinePatientNotFoundError';
        Object.setPrototypeOf(this, MediOnlinePatientNotFoundError.prototype);
    }
}

/**
 * Error thrown when multiple patients match the search criteria
 */
export class MediOnlineMultiplePatientsError extends MediOnlineCreateTreatmentStepError {
    constructor(message: string = 'Plusieurs patients correspondent aux critères de recherche. Veuillez affiner les informations du patient.') {
        super(CreateTreatmentSteps.OPEN_PATIENT_DASHBOARD, message);
        this.name = 'MediOnlineMultiplePatientsError';
        Object.setPrototypeOf(this, MediOnlineMultiplePatientsError.prototype);
    }
}

/**
 * Error thrown when voucher upload fails
 */
export class MediOnlineUploadError extends MediOnlineCreateTreatmentStepError {
    constructor(message: string) {
        super(CreateTreatmentSteps.UPLOAD_VOUCHER, message);
        this.name = 'MediOnlineUploadError';
        Object.setPrototypeOf(this, MediOnlineUploadError.prototype);
    }
}

/**
 * Error thrown when insurance information is not properly set
 */
export class MediOnlineInsuranceError extends MediOnlineCreateTreatmentStepError {
    constructor(message: string = 'le débiteur ou le type d\'assurance n\'est pas correctement défini.') {
        super(CreateTreatmentSteps.OPEN_TREATMENT_INFOS, message);
        this.name = 'MediOnlineInsuranceError';
        Object.setPrototypeOf(this, MediOnlineInsuranceError.prototype);
    }
}

export class MediOnlineDoctorNotFoundError extends MediOnlineCreateTreatmentStepError {
    constructor(message: string = 'No doctor found with the provided RCC.') {
        super(CreateTreatmentSteps.ADD_DOCTOR_INFO, message);
        this.name = 'MediOnlineDoctorNotFoundError';
        Object.setPrototypeOf(this, MediOnlineDoctorNotFoundError.prototype);
    }
}

export class MediOnlineDoctorRccNoMatchFullnameError extends MediOnlineCreateTreatmentStepError {
    constructor(message: string = 'Doctor RCC does not match the provided full name.') {
        super(CreateTreatmentSteps.ADD_DOCTOR_INFO, message);
        this.name = 'MediOnlineDoctorRccNoMatchFullnameError';
        Object.setPrototypeOf(this, MediOnlineDoctorRccNoMatchFullnameError.prototype);
    }
}

export class MediOnlineCentreError extends MediOnlineCreateTreatmentStepError {
    constructor(message: string) {
        super(CreateTreatmentSteps.OPEN_TREATMENT, message);
        this.name = 'MediOnlineCentreError';
        Object.setPrototypeOf(this, MediOnlineCentreError.prototype);
    }
}

export interface PatientInfo {
    noPatient?: string,
    titre?: string,
    titreCourtoisie?: string,
    adressCompl?: string,
    rue?: string,
    npa?: string,
    localite?: string,
    tel1?: string,
    noTel1?: string,
    tel2?: string,
    noTel2?: string,
    tel3?: string,
    noTel3?: string,
    ddn?: string,
    langue?: string,
    nationalite?: string,
    dob?: string,
    dateDeces?: string,
    noAvs?: string,
    employeur?: string,
    profession?: string,
    etatCivil?: string,
    nomJeuneFille?: string,
    medecinTraitant?: string,
    sexe?: string,
    genre?: string,
    pays?: string,
    coord?: string,
    email?: string,
    notificationSMS?: string,
    debiteur?: string,
    contact?: string,
    representantLegal?: string,
    commentaire?: string,
}

export interface AppointmentInfo {
    date?: string,
    status?: string,
    duration?: number,
    eventName?: string,
    contact?: string,
    centre?: string,
    practitioner?: string,
}

export interface ServicesInfo {
    date?: string,
    number?: number,
    positionNumber?: string,
    description?: string,
    unitValue?: number
    ptNbr?: number,
    ptValue?: number,
    amount?: number,
}

export interface InvoiceInfo {
    centre?: string,
    date?: string,
    invoiceNumber?: string,
    noAssuredPerson?: string,
    reimbursmentType?: string,
    law?: string,
    treatmentType?: string,
    noAssuredCard?: string,
    treatmentStartDate?: string,
    treatmentEndDate?: string,
    prestationLocation?: string,
    prescribingDoctor?: string,
    prescribingDoctorAdress?: string,
    totalAmount?: number,
    services?: ServicesInfo[],
    patientAVS?: string,
}
