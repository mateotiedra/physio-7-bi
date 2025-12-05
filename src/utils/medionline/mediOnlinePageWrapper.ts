import { FrameLocator, Locator, Page } from "playwright";
import { promises as fs } from 'fs';
import * as path from 'path';
import { MediOnlineError, MediOnlineMultiplePatientsError, MediOnlinePatientNotFoundError, MediOnlineCreateTreatmentUnknownError, AppointmentInfo, InvoiceInfo, ServicesInfo } from "./medionline.types";
import { PatientInfo } from "./medionline.types";

export class MediOnlinePageWrapper {
    constructor(private context: FrameLocator | Locator | Page) { }

    /**
     * Set a new context (useful when switching pages)
     */
    setContext(context: FrameLocator | Locator | Page): void {
        this.context = context;
    }

    /**
     * Get the current page instance
     * @throws Error if context is not a Page
     */
    private get page(): Page {
        if ('goto' in this.context) {
            return this.context as Page;
        }
        throw new MediOnlineError('Context is not a Page instance', 'INVALID_CONTEXT');
    }

    /**
     * Select an option from a dropdown by matching text content
     *
     * @param selectId - The ID attribute of the select element
     * @param includeStr - The text that should be included in the option to select
     * @returns Promise that resolves when the option is selected
     * @throws MediOnlineSelectOptionNotFoundError if no matching option is found
     */
    async selectOptionIncludeStr(selectStr: string, includeStr: string, context: FrameLocator | Locator | Page = this.context): Promise<void> {
        const selectElement = context.locator(`select[id="${selectStr}"]`);

        // Wait for the select element to exist
        await selectElement.waitFor({ state: 'attached', timeout: 10000 });

        // Wait for options to be populated (retry logic)
        const targetOption = selectElement.locator(`option:has-text("${includeStr}")`).first();

        try {
            // Wait up to 5 seconds for the option to appear
            await targetOption.waitFor({ state: 'attached', timeout: 5000 });
        } catch (error) {
            throw new MediOnlineError(`No option including "${includeStr}" found in select with ID "${selectStr}"`, 'SELECT_OPTION_NOT_FOUND');
        }

        await selectElement.selectOption({ value: await targetOption.getAttribute('value') || '' });
    }

    /**
     * Navigate back to the MediOnline homepage
     *
     * @returns Promise that resolves when navigation is complete
     * @throws MediOnlineNavigationError if navigation fails
     */
    async goToHomepage(): Promise<void> {
        try {
            // Click the home button to return to homepage
            await this.page.click('a[id="ctl00_home"]');
            await this.page.waitForLoadState('networkidle');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new MediOnlineError(`Failed to navigate to homepage: ${errorMessage}`, 'NAVIGATION_ERROR');
        }
    }

    /**
     * Search for a patient and navigate to their dashboard
     *
     * @param firstName - Patient's first name
     * @param lastName - Patient's last name
     * @param dateOfBirth - Patient's date of birth
     * @returns Promise that resolves when navigation is complete
     * @throws MediOnlinePatientNotFoundError if patient is not found
     * @throws MediOnlineMultiplePatientsError if multiple patients match
     * @throws MediOnlineNavigationError if navigation fails
     */
    async goToPatientDashboard(firstName: string, lastName: string, dateOfBirth: string): Promise<void> {
        try {
            console.log(`Navigating to dashboard for patient: ${firstName} ${lastName}`);

            // Navigate to patient search
            await this.searchPatients({ firstName, lastName, dateOfBirth });

            // Wait for search results to load
            await this.page.waitForLoadState('networkidle');

            // Count the number of rows in the search results table
            const resultTable = await this.page.locator('table#ctl00_CPH_ctl00_PatientSearchResult_GridView1 tbody').first();
            const rowCount = await resultTable.locator('> tr').count() - 3;

            if (rowCount < 1) {
                await this.goToHomepage();
                throw new MediOnlinePatientNotFoundError();
            }

            // If multiple patients found, return error as we need exact match
            if (rowCount > 1) {
                await this.goToHomepage();
                throw new MediOnlineMultiplePatientsError();
            }

            // Click the edit button for the patient
            await this.page.click('input[name*="btnEdit"]');
            await this.page.waitForLoadState('networkidle');

        } catch (error) {
            if (error instanceof MediOnlineError) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new MediOnlineError(`Erreur lors de la navigation vers la page du patient: ${errorMessage}`, 'NAVIGATION_ERROR');
        }
    }

    async searchPatients({ firstName, lastName, dateOfBirth }: { firstName: string; lastName: string; dateOfBirth: string }): Promise<void> {

        // Navigate to patient search
        await this.page.click('input[name="ctl00$btnShortcut2"]');
        await this.page.waitForLoadState('networkidle');

        // Fill in patient details and search
        await this.page.fill('input[name="ctl00$CPH$ctl00$patientSearch1$txtLastName"]', lastName);
        await this.page.fill('input[name="ctl00$CPH$ctl00$patientSearch1$txtFirstName"]', firstName);
        await this.page.fill('input[name="ctl00$CPH$ctl00$patientSearch1$txtBirthdate"]', dateOfBirth);
        await this.page.click('input[name="ctl00$CPH$ctl00$patientSearch1$btnAdvancedSearch"]');

        await this.page.waitForLoadState('networkidle');
    }

    private async isTiersPayantRow(patientIndex: number): Promise<boolean> {
        try {
            let accessPatientInfoButton = this.page.locator(`input[id="ctl00_CPH_ctl00_PatientSearchResult_GridView1_ctl${(patientIndex + 3).toString().padStart(2, '0')}_btnEdit"]`);
            await accessPatientInfoButton.waitFor({ timeout: 5000 });
            if (await accessPatientInfoButton.count() === 0) {
                return true;
            }
        } catch (error) {
            return true;
        }
        return false;
    }

    async goToPatientInfoPage(patientIndex: number): Promise<void> {
        // Check if the patient at patientIndex exists (or is it a tiers payant row?)
        if (await this.isTiersPayantRow(patientIndex)) {
            throw new MediOnlineError(`No patient found at index ${patientIndex}`, 'TIERS_PATIENT_ROW')
        }

        // Click the edit button for the patient
        await this.page.click(`input[id="ctl00_CPH_ctl00_PatientSearchResult_GridView1_ctl${(patientIndex + 3).toString().padStart(2, '0')}_btnEdit"]`);
    }

    async goToPatientSearchPage(pageIndex: number): Promise<boolean> {
        await this.page.waitForTimeout(1000);
        await this.page.waitForLoadState('networkidle');

        // Count the number of rows in the search results table to confirm navigation
        const resultTable = this.page.locator('table#ctl00_CPH_ctl00_PatientSearchResult_GridView1 tbody').first();
        await resultTable.innerHTML();
        const rowCount = await resultTable.locator('> tr').count();

        /* if (rowCount < 28) {
            throw new Error('You have reached the last page (the page you\'re currently on).');
        } */

        // This executes inside the page and triggers the same server-side postback as clicking the link.
        const eventTarget = 'ctl00$CPH$ctl00$PatientSearchResult$GridView1';
        const eventArgument = `Page$${pageIndex}`;

        const doPostBackExists = await this.page.evaluate(() => typeof ((globalThis as any).__doPostBack) === 'function');
        if (doPostBackExists) {
            await this.page.evaluate(({ target, arg }) => {
                (globalThis as any).__doPostBack(target, arg);
            }, { target: eventTarget, arg: eventArgument });
            await this.page.waitForLoadState('networkidle');
            return true;
        }

        throw new Error('Could not find pager link or perform postback');
    }

    // Helper to safely get input/select values
    async getInputValue(selector: string): Promise<string | undefined> {
        await this.page.locator(selector).innerHTML();
        const locator = this.page.locator(selector).first();
        if (await locator.count() === 0) {
            throw new MediOnlineError(`Input element not found for selector: ${selector}`, 'ELEMENT_NOT_FOUND');
        }
        try {
            const v = await locator.inputValue();
            return v !== '' ? v : undefined;
        } catch {
            // fallback to value attribute
            const attr = await locator.getAttribute('value');
            return attr ?? undefined;
        }
    };

    async getSelectText(selector: string): Promise<string | undefined> {
        const opt = this.page.locator(`${selector} option:checked`).first();
        if (await opt.count() > 0) {
            const txt = await opt.textContent();
            return txt?.trim() || undefined;
        }
        // fallback: try to read selectedIndex via evaluate
        try {
            return await this.page.evaluate((sel) => {
                const doc: any = (globalThis as any).document;
                if (!doc) return undefined;
                const s: any = doc.querySelector(sel);
                if (!s) return undefined;
                const idx = typeof s.selectedIndex === 'number' ? s.selectedIndex : -1;
                const o = s.options && s.options[idx];
                const text = o ? (o.text || o.textContent || '').trim() : undefined;
                return text;
            }, selector);
        } catch {
            return undefined;
        }
    };

    async getRadioValue(radioConfigs: Array<{ id: string; label: string }>): Promise<string | undefined> {
        try {
            for (const radio of radioConfigs) {
                const radioLocator = this.page.locator(radio.id).first();
                if (await radioLocator.count() > 0) {
                    const isChecked = await radioLocator.isChecked().catch(() => false);
                    if (isChecked) {
                        return radio.label;
                    }
                }
            }
            return undefined;
        } catch {
            return undefined;
        }
    };

    async scrapePatientInfos(): Promise<PatientInfo> {
        const info: PatientInfo = {};

        // General patient info
        info.nom = await this.getInputValue('input[id="ctl00_CPH_ctl00_patientDetails_txtLastName"]');
        info.prenom = await this.getInputValue('input[id="ctl00_CPH_ctl00_patientDetails_txtFirstName"]');
        info.noPatient = await this.getInputValue('input[id="ctl00_CPH_ctl00_patientDetails_txtNumber"]');
        info.langue = await this.getSelectText('#ctl00_CPH_ctl00_patientDetails_ddlLanguage');
        info.nationalite = await this.getSelectText('#ctl00_CPH_ctl00_patientDetails_ddlNationality');
        info.ddn = await this.getInputValue('input[id="ctl00_CPH_ctl00_patientDetails_txtBirthdate"]');
        info.dateDeces = await this.getInputValue('input[id="ctl00_CPH_ctl00_patientDetails_txtDeathDate"]');
        info.noAvs = await this.getInputValue('input[id="ctl00_CPH_ctl00_patientDetails_txtAvsNb"]');
        info.employeur = await this.getInputValue('input[id="ctl00_CPH_ctl00_patientDetails_txtEmployerNb"]');
        info.profession = await this.getInputValue('input[id="ctl00_CPH_ctl00_patientDetails_txtOccupation"]');
        info.etatCivil = await this.getSelectText('#ctl00_CPH_ctl00_patientDetails_ddlMaritalStatus');
        info.nomJeuneFille = await this.getInputValue('input[id="ctl00_CPH_ctl00_patientDetails_txtMaidenName"]');
        info.medecinTraitant = await this.getInputValue('input[id="ctl00_CPH_ctl00_patientDetails_txtSentBy"]');
        info.sexe = await this.getRadioValue([
            { id: '#ctl00_CPH_ctl00_patientDetails_rbtnMale', label: 'Masculin' },
            { id: '#ctl00_CPH_ctl00_patientDetails_rbtnFemale', label: 'Féminin' },
        ]);
        info.genre = await this.getRadioValue([
            { id: '#ctl00_CPH_ctl00_patientDetails_rbtnMaleFODA5', label: 'Masculin' },
            { id: '#ctl00_CPH_ctl00_patientDetails_rbtnFemaleFODA5', label: 'Féminin' },
            { id: '#ctl00_CPH_ctl00_patientDetails_rbtnDiverseFODA5', label: 'Divers' }
        ]);
        try {
            const chk = this.page.locator('#ctl00_CPH_ctl00_patientDetails_chkNetworkCare').first();
            if (await chk.count() > 0) {
                const isChecked = await chk.isChecked().catch(() => false);
                if (isChecked) {
                    info.coord = await this.getInputValue('#ctl00_CPH_ctl00_patientDetails_txtNetworkCare');
                }
            }
        } catch { /* ignore */ }

        // Adress info
        info.titre = await this.getSelectText('#ctl00_CPH_ctl00_patientDetails_ctrlTitle_DropDownListTitres');
        info.adressCompl = await this.getInputValue('#ctl00_CPH_ctl00_patientDetails_txtAddress1');
        info.rue = await this.getInputValue('#ctl00_CPH_ctl00_patientDetails_txtAddress2');
        info.npa = await this.getInputValue('#ctl00_CPH_ctl00_patientDetails_location_TextBoxNPA');
        info.localite = await this.getInputValue('#ctl00_CPH_ctl00_patientDetails_location_TextBoxVille');
        info.pays = await this.getSelectText('#ctl00_CPH_ctl00_patientDetails_location_DropDownListPays');

        // Phone numbers
        info.tel1 = await this.getInputValue('#ctl00_CPH_ctl00_patientDetails_txtPhone1Label');
        info.noTel1 = await this.getInputValue('#ctl00_CPH_ctl00_patientDetails_txtPhone1');
        info.tel2 = await this.getInputValue('#ctl00_CPH_ctl00_patientDetails_txtPhone2Label');
        info.noTel2 = await this.getInputValue('#ctl00_CPH_ctl00_patientDetails_txtPhone2');
        info.tel3 = await this.getInputValue('#ctl00_CPH_ctl00_patientDetails_txtPhone3Label');
        info.noTel3 = await this.getInputValue('#ctl00_CPH_ctl00_patientDetails_txtPhone3');

        // Email
        info.email = await this.getInputValue('#ctl00_CPH_ctl00_patientDetails_txtEmail');

        // SMS notification checkbox
        try {
            const smsChk = this.page.locator('#ctl00_CPH_ctl00_patientDetails_chkSMsNotification').first();
            if (await smsChk.count() > 0) {
                const isChecked = await smsChk.isChecked().catch(() => false);
                info.notificationSMS = isChecked ? 'Oui' : 'Non';
            }
        } catch { /* ignore */ }

        // Patient status flags
        info.debiteur = await this.getRadioValue([
            { id: '#ctl00_CPH_ctl00_patientDetails_rbtnDebtorNo', label: 'Non' },
            { id: '#ctl00_CPH_ctl00_patientDetails_rbtnDebtorYes', label: 'Oui' }
        ]);
        info.contact = await this.getRadioValue([
            { id: '#ctl00_CPH_ctl00_patientDetails_rbtnContactNo', label: 'Non' },
            { id: '#ctl00_CPH_ctl00_patientDetails_rbtnContactYes', label: 'Oui' }
        ]);
        info.representantLegal = await this.getRadioValue([
            { id: '#ctl00_CPH_ctl00_patientDetails_rbtnHeadOfGroupNo', label: 'Non' },
            { id: '#ctl00_CPH_ctl00_patientDetails_rbtnHeadOfGroupYes', label: 'Oui' }
        ]);

        // Comment textarea
        info.commentaire = await this.getInputValue('#ctl00_CPH_ctl00_patientDetails_txtComment');

        return info;
    }

    async scrapePatientAppointments(): Promise<AppointmentInfo[]> {
        await this.page.click('#ctl00_CPH_ctl00_pati_tabs_011_lbtnAppointment');

        await this.page.waitForLoadState('networkidle');

        const iframe = this.page.frameLocator('#ctl00_CPH_ctl00_pati_tabs_011_ctl00_myIframe');

        // Wait for iframe to be fully loaded
        await this.page.waitForTimeout(1000);
        await this.page.waitForLoadState('networkidle');
        await iframe.locator('body').waitFor({ state: 'visible' });

        const noAppointmentsSpan = iframe.locator('span#ctl00_MainContentPlaceHolder_lvAgenda_ctrl0_lblNoAppointment');
        if (await noAppointmentsSpan.count() > 0) {
            console.log('No appointments found for this patient');
            return [];
        }

        const appointmentContainers = await iframe.locator('div.formContainer').all();

        if (appointmentContainers.length === 0) {
            throw new MediOnlineError('No appointment containers found on the appointments page', 'NO_APPOINTMENT_CONTAINERS');
        }

        const allAppointments: AppointmentInfo[] = [];

        for (const container of appointmentContainers) {
            // Extract centre and practitioner from the header link
            let centre: string | undefined;
            let practitioner: string | undefined;

            try {
                // Select the first <a> inside the first <div> of the formContainer
                const headerLink = container.locator('div').first().locator('a').first();
                const headerText = await headerLink.textContent();
                if (headerText) {
                    // Format: "Charmilles / Yohann Ruggieri"
                    const cleaned = headerText.trim().replace(/\s+/g, ' ');
                    const parts = cleaned.split('/').map(p => p.trim());
                    if (parts.length === 2) {
                        centre = parts[0];
                        practitioner = parts[1];
                    }
                }
            } catch (error) {
                throw new MediOnlineError(`Failed to parse centre/practitioner from header: ${error}`, 'PARSE_ERROR');
            }

            // Find all appointment rows in the table (tbody > tr)
            const rows = await container.locator('table.cdmList tbody tr').all();

            for (const row of rows) {
                try {
                    const appointment: AppointmentInfo = {};

                    // Get all td cells in the row
                    const cells = await row.locator('td.smallText.bordered').all();

                    const dateText = await cells[2].textContent();
                    if (dateText) {
                        const trimmed = dateText.trim();
                        const [datePart, timePart] = trimmed.split(' ');
                        const [day, month, year] = datePart.split('.');
                        const isoDate = `${year}-${month}-${day}T${timePart}:00`;
                        appointment.date = isoDate;
                    } else {
                        appointment.date = undefined;
                    }

                    // Index 3: Status (e.g., "Rdv", "Excusé")
                    const statusText = await cells[3].textContent();
                    appointment.status = statusText?.trim();

                    // Index 4: Duration (e.g., "30'")
                    const durationText = await cells[4].textContent();
                    appointment.duration = durationText ? parseInt(durationText.trim().replace("'", '')) : undefined;

                    // Index 5: Event name (e.g., "Consultation de suivi 30min")
                    const eventText = await cells[5].textContent();
                    appointment.eventName = eventText?.trim();

                    // Index 6: Contact (e.g., "Abazi\nValmire" - name on multiple lines)
                    const contactText = await cells[6].textContent();
                    appointment.contact = contactText?.trim().replace(/\s+/g, ' ');

                    appointment.centre = centre;
                    appointment.practitioner = practitioner;

                    allAppointments.push(appointment);
                } catch (error) {
                    throw new MediOnlineError(`Failed to parse appointment row: ${error}`, 'APPOINTMENT_ROW_PARSE_ERROR');
                }
            }
        }

        return allAppointments;
    }

    async scrapePatientInvoices(patientAVS: string): Promise<InvoiceInfo[]> {
        await this.page.click('#ctl00_CPH_ctl00_pati_tabs_011_lbtnInvoice');
        await this.page.waitForTimeout(1000);
        await this.page.waitForLoadState('networkidle');

        const iframe = this.page.frameLocator('#ctl00_CPH_ctl00_pati_tabs_011_ctl00_myIframe');
        // Wait for iframe to be fully loaded
        await iframe.locator('body').waitFor({ state: 'visible' });

        await this.selectOptionIncludeStr('ctl00_MainContentPlaceHolder_ddlLimit', 'Toutes', iframe);

        await this.page.waitForTimeout(1000);
        await this.page.waitForLoadState('networkidle');

        // Check if there are no invoices (span with "Aucune facture" message)
        const noInvoiceSpan = iframe.locator('span#ctl00_MainContentPlaceHolder_lvAccount_ctrl0_lblNoInvoice');
        if (await noInvoiceSpan.count() > 0) {
            console.log('No invoices found for this patient');
            return [];
        }
        await iframe.locator('div[content="true"]').first().waitFor({ state: 'attached' });
        const invoiceContainers = await iframe.locator('div.formContainer').all();

        if (invoiceContainers.length === 0) {
            throw new MediOnlineError('No invoice containers found on the invoices page', 'NO_INVOICE_CONTAINERS');
        }

        const allInvoices: InvoiceInfo[] = [];

        for (const container of invoiceContainers) {
            await container.innerHTML();

            // Click the header link to expand/load invoice details for this centre
            const containerOpener = container.locator('a').first();
            const isCollapsed = await containerOpener.getAttribute('class').then(c => c?.includes('collapsed')) || false;
            const openCenterDivIfCollapsed = async () => {
                if (isCollapsed) {
                    await containerOpener.click();
                    await this.page.waitForTimeout(1000);
                    await this.page.waitForLoadState('networkidle');
                    await container.innerHTML();
                }
            };
            await openCenterDivIfCollapsed();

            let centre: string;

            // Extract centre from the parent formContainer header
            const headerLink = container.locator('div').first().locator('a').first();
            centre = (await headerLink.textContent())?.replace(/\s+/g, ' ').trim() || 'inconnu';

            // Find all invoice rows in the table (tbody > tr)
            const rows = await container.locator('table.cdmList tbody tr').all();

            await this.page.waitForLoadState('networkidle');

            for (const row of rows) {
                try {
                    const invoice: InvoiceInfo = {};

                    invoice.patientAVS = patientAVS;
                    invoice.centre = centre;

                    await row.waitFor({ state: 'visible' });

                    const statusCells = await row.locator('td').all();

                    const statusText = statusCells.length >= 2
                        ? (
                            await statusCells[statusCells.length - 2].first().innerText() +
                            await statusCells[statusCells.length - 1].first().innerText()
                        ) : statusCells.length === 1
                            ? await statusCells[0].innerText()
                            : '';

                    let contPopUpPromise;

                    if (statusText.includes('Ann')) {
                        invoice.status = 'Annulée';
                    } else if (statusText.includes('Pmt')) {
                        invoice.status = 'Payée';
                    } else if (statusText.includes('Cont')) {
                        invoice.status = 'Contentieux';
                        // Prepare to handle the popup that appears when clicking "Cont" link
                        try {
                            contPopUpPromise = (await this.page.waitForEvent('popup', { timeout: 5000 }));
                        } catch (error) {
                        }
                    } else {
                        invoice.status = 'Autre';
                    }

                    // Click the view invoice button - specifically the one with icon-voir.gif (not calendar/appointment buttons)
                    const viewButton = row.locator('input[type="image"]').first();
                    await viewButton.waitFor({ state: 'visible' });
                    await viewButton.click();

                    // If "Cont" was clicked, handle the popup
                    if (contPopUpPromise) {
                        const contPopUp = await contPopUpPromise;
                        contPopUp.close();
                    }

                    await this.page.waitForLoadState('networkidle');

                    // Wait for the invoice details table to be visible - with graceful fallback
                    await this.page.locator('table td.font10grey').first().waitFor({ state: 'visible' });

                    // Helper function to extract value from table by label
                    const extractValue = async (labelText: string): Promise<string | undefined> => {
                        try {
                            // Find all tables with font10grey cells
                            const allTables = await this.page.locator('table').all();
                            for (const table of allTables) {
                                const rows = await table.locator('tr').all();
                                for (const tr of rows) {
                                    const cells = await tr.locator('td.font10grey').all();
                                    if (cells.length >= 2) {
                                        const label = await cells[0].textContent();
                                        if (label?.trim() === labelText) {
                                            const value = await cells[1].textContent();
                                            return value?.trim();
                                        }
                                    }
                                }
                            }
                        } catch (error) {
                            throw new MediOnlineError(`Failed to extract ${labelText}: ${error}`, 'EXTRACT_VALUE_ERROR');
                        }
                        return undefined;
                    };

                    // Extract all fields
                    const dateText = await extractValue('Date facture');
                    if (dateText) {
                        const [day, month, year] = dateText.split('.');
                        invoice.date = `${year}-${month}-${day}`;
                    }

                    invoice.invoiceNumber = await extractValue('N° facture');
                    invoice.reimbursmentType = await extractValue('Type de remb.');
                    invoice.law = await extractValue('Loi');
                    invoice.treatmentType = await extractValue('Motif traitement');
                    invoice.noAssuredCard = await extractValue('N° carte d\'assuré');
                    invoice.noAssuredPerson = await extractValue('N° assuré');

                    const caseDateText = await extractValue('Date cas');
                    if (caseDateText) {
                        const [day, month, year] = caseDateText.split('.');
                        invoice.caseDate = `${year}-${month}-${day}`;
                    }

                    invoice.decisionNumber = await extractValue('N° décision');

                    const startDateText = await extractValue('Début traitement');
                    if (startDateText) {
                        const [day, month, year] = startDateText.split('.');
                        invoice.treatmentStartDate = `${year}-${month}-${day}`;
                    }

                    const endDateText = await extractValue('Fin traitement');
                    if (endDateText) {
                        const [day, month, year] = endDateText.split('.');
                        invoice.treatmentEndDate = `${year}-${month}-${day}`;
                    }

                    invoice.prestationLocation = await extractValue('Lieu fourn. prest.');
                    invoice.prescribingDoctor = await extractValue('Nom');

                    // Extract address - get both lines separately
                    const adressLine1 = await extractValue('Adresse');
                    // Find the row with "Adresse" and get the next row's second cell
                    try {
                        const allTables = await this.page.locator('table').all();
                        for (const table of allTables) {
                            const rows = await table.locator('tr').all();
                            for (let i = 0; i < rows.length - 1; i++) {
                                const cells = await rows[i].locator('td.font10grey').all();
                                if (cells.length >= 2) {
                                    const label = await cells[0].textContent();
                                    if (label?.trim() === 'Adresse') {
                                        // Get the next row's second cell (city)
                                        const nextCells = await rows[i + 1].locator('td.font10grey').all();
                                        if (nextCells.length >= 2) {
                                            const adressLine2 = await nextCells[1].textContent();
                                            invoice.prescribingDoctorAdress = adressLine1
                                                ? `${adressLine1} ${adressLine2?.trim() || ''}`.trim()
                                                : adressLine2?.trim();
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        // Fallback: just use first line if we can't get the second
                        invoice.prescribingDoctorAdress = adressLine1;
                    }

                    // Gather all data about services
                    try {
                        const services: ServicesInfo[] = [];

                        // Find the services table by looking for the header with class 'presta-head-table'
                        const prestaTable = this.page.locator('#ctl00_CPH_ctl00_ctl10_TableInfo').locator('table').first() || this.page.locator('#ctl00_CPH_ctl00_ctl12_TableInfo').locator('table').first();
                        await prestaTable.innerHTML();

                        // Found the services table, now get all data rows
                        const servicesRows = await prestaTable.locator('tbody tr').all();

                        for (const serviceRow of servicesRows) {
                            try {
                                // Skip header row
                                const isHeader = await serviceRow.locator('td.presta-head-table').count() > 0;
                                if (isHeader) continue;

                                const cells = await serviceRow.locator('td').all();

                                if (cells.length >= 13) {
                                    const service: ServicesInfo = {};

                                    // Index 1: Date (e.g., "15.02.2023")
                                    const dateText = await cells[1].textContent();
                                    if (dateText) {
                                        const trimmed = dateText.trim();
                                        const [day, month, year] = trimmed.split('.');
                                        service.date = `${year}-${month}-${day}`;
                                    }

                                    // Index 2: Number (e.g., "1.00")
                                    const numberText = await cells[2].textContent();
                                    service.number = numberText ? parseFloat(numberText.trim()) : undefined;

                                    // Index 4: Position Number (e.g., "7301")
                                    const positionText = await cells[4].textContent();
                                    service.positionNumber = positionText?.trim();

                                    // Index 5: Description (e.g., "Forfait par séance individuelle pour physiothérapie générale")
                                    const descText = await cells[5].textContent();
                                    service.description = descText?.trim();

                                    // Index 8: Unit Value (e.g., "47.04")
                                    const unitValueText = await cells[8].textContent();
                                    service.unitValue = unitValueText ? parseFloat(unitValueText.trim()) : undefined;

                                    // Index 9: Pt Nbr (e.g., "48.00")
                                    const ptNbrText = await cells[9].textContent();
                                    service.ptNbr = ptNbrText ? parseFloat(ptNbrText.trim()) : undefined;

                                    // Index 11: Pt Value (e.g., "0.98")
                                    const ptValueText = await cells[11].textContent();
                                    service.ptValue = ptValueText ? parseFloat(ptValueText.trim()) : undefined;

                                    // Index 12: Amount (e.g., "47.04")
                                    const amountText = await cells[12].textContent();
                                    service.amount = amountText ? parseFloat(amountText.trim()) : undefined;

                                    services.push(service);
                                }
                            } catch (rowError) {
                                throw new MediOnlineError(`Failed to parse service row: ${rowError}`, 'SERVICE_ROW_PARSE_ERROR');
                            }
                        }

                        invoice.services = services.length > 0 ? services : undefined;
                    } catch (error) {
                        throw new MediOnlineError(`Failed to extract services: ${error}`, 'EXTRACT_SERVICES_ERROR');
                    }

                    // Extract total amount
                    try {
                        // Find all elements with 'TableInfo' in their id and get the last one
                        const allTableInfoElements = await this.page.locator('[id*="TableInfo"]').all();

                        if (allTableInfoElements.length > 0) {
                            const totalTable = allTableInfoElements[allTableInfoElements.length - 1];
                            const cells = await totalTable.locator('td.font10grey').all();
                            //console.log(`Found ${cells.length} td.font10grey cells in total table`);

                            if (cells.length > 0) {
                                const lastCell = cells[cells.length - 1];
                                const totalText = await lastCell.innerText();
                                //console.log(`Total amount text: "${totalText}"`);
                                invoice.totalAmount = parseFloat(totalText);
                            } else {
                                throw new MediOnlineError('No td.font10grey cells found in total table', 'TOTAL_AMOUNT_CELLS_NOT_FOUND');
                            }
                        } else {
                            invoice.totalAmount = undefined;
                            throw new Error('No elements with TableInfo in id found');
                        }
                    } catch (error) {
                        throw new MediOnlineError(`Failed to extract total amount for the invoice ${invoice.invoiceNumber} - ${invoice.centre}: ${error}`, 'EXTRACT_TOTAL_AMOUNT_ERROR');
                    }

                    allInvoices.push(invoice);

                    await this.goBack();
                    await this.page.waitForLoadState('networkidle');

                    await openCenterDivIfCollapsed();

                } catch (error) {
                    throw new MediOnlineError(`Failed to parse invoice row: ${(error instanceof Error) ? error.message : error}`, 'INVOICE_ROW_PARSE_ERROR');
                    // Try to go back if we're stuck in detail view
                }
            }
        }

        return allInvoices;
    }

    async goBack(): Promise<void> {
        await this.page.click('#ctl00_back');
        await this.page.waitForLoadState('networkidle');
    }

    getContext(): FrameLocator | Locator | Page {
        return this.context;
    }
}