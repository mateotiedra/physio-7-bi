-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    no_patient TEXT,
    no_avs TEXT,
    titre TEXT,
    titre_courtoisie TEXT,
    nom TEXT,
    prenom TEXT,
    adresse_compl TEXT,
    rue TEXT,
    npa TEXT,
    localite TEXT,
    tel1 TEXT,
    no_tel1 TEXT,
    tel2 TEXT,
    no_tel2 TEXT,
    tel3 TEXT,
    no_tel3 TEXT,
    ddn TEXT,
    langue TEXT,
    nationalite TEXT,
    dob TEXT,
    date_deces TEXT,
    employeur TEXT,
    profession TEXT,
    etat_civil TEXT,
    nom_jeune_fille TEXT,
    medecin_traitant TEXT,
    sexe TEXT,
    genre TEXT,
    pays TEXT,
    coord TEXT,
    email TEXT,
    notification_sms TEXT,
    debiteur TEXT,
    contact TEXT,
    representant_legal TEXT,
    commentaire TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_patients_no_avs ON patients(no_avs) WHERE no_avs IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patients_no_patient ON patients(no_patient) WHERE no_patient IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patients_nom_prenom ON patients(nom, prenom);
CREATE INDEX IF NOT EXISTS idx_patients_ddn ON patients(ddn);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for patients table
CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
