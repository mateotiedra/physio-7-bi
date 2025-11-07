import { FrameLocator, Locator, Page } from "playwright";
import { MediOnlineError, MediOnlineInsuranceError, MediOnlineDoctorNotFoundError, MediOnlineMultiplePatientsError, MediOnlinePatientNotFoundError, MediOnlineCreateTreatmentUnknownError } from "../../../types/medionline.types";
import { calculateStringSimilarity } from "../helpers";
import { VoucherData } from "../../../types/voucher.types";

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
    async selectOptionIncludeStr(selectStr: string, includeStr: string): Promise<void> {
        const selectElement = this.context.locator(`select[id="${selectStr}"]`);
        await selectElement.locator('option').all();
        await selectElement.innerHTML();

        const targetOption = selectElement.locator(`option:has-text("${includeStr}")`).first();
        const optionExists = await targetOption.count() > 0;

        if (!optionExists) {
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
            await this.page.click('input[name="ctl00$btnShortcut2"]');
            await this.page.waitForLoadState('networkidle');

            // Fill in patient details and search
            await this.page.fill('input[name="ctl00$CPH$ctl00$patientSearch1$txtLastName"]', lastName);
            await this.page.fill('input[name="ctl00$CPH$ctl00$patientSearch1$txtFirstName"]', firstName);
            await this.page.fill('input[name="ctl00$CPH$ctl00$patientSearch1$txtBirthdate"]', dateOfBirth);
            await this.page.click('input[name="ctl00$CPH$ctl00$patientSearch1$btnAdvancedSearch"]');

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

    /**
     * Navigate to the treatment page from the patient dashboard
     * @returns Promise that resolves to the treatment page
     */
    async goToTreatmentPage(): Promise<void> {
        try {
            // Go to the treatment tab
            await this.page.click('a[id="ctl00_CPH_ctl00_pati_tabs_011_lbtnTraitement"]');
            await this.page.waitForLoadState('networkidle');

            // Access the iframe where the treatment content is loaded
            const treatmentFrame = this.page.frameLocator('iframe[id="ctl00_CPH_ctl00_pati_tabs_011_ctl00_myIframe"]');

            // Select Centre + create a new treatment entry
            const centreID = 'MED3A SA';
            try {
                const frameWrapper = new MediOnlinePageWrapper(treatmentFrame);
                await frameWrapper.selectOptionIncludeStr('ctl00_MainContentPlaceHolder_ddlAccount', centreID);
            } catch (error) {
                throw new MediOnlineCreateTreatmentUnknownError(`Erreur lors de la selection du centre: ${(error as Error).message}`);
            }
            await treatmentFrame.locator('input[id="ctl00_MainContentPlaceHolder_btnNew"]').click();
            await this.page.waitForLoadState('networkidle');
        } catch (error) {
            if (error instanceof MediOnlineError) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
            throw new MediOnlineCreateTreatmentUnknownError(`Erreur inattendue lors de la navigation vers la page de traitement: ${errorMessage}`);
        }
    }

    /**
     * Navigate to the treatment infos page from the treatment page
     * @returns Promise that resolves to the treatment infos page
     */
    async goToTreatmentInfosPage(): Promise<MediOnlinePageWrapper> {
        let treatmentInfosPage: Page | null = null;
        try {
            await this.page.waitForLoadState('networkidle');

            // Wait for the modification request button to appear with a timeout
            const editTreatmentInfosButton = this.page.locator('a[id="ctl00_CPH_ctl00_ModuleAffichage_InfoTraitement_ButtonDemandeModification"]').first();

            try {
                await editTreatmentInfosButton.waitFor({ state: 'attached', timeout: 5000 });
            } catch (error) {
                // Button doesn't exist - insurance issue
                throw new MediOnlineInsuranceError();
            }

            // Open the treatmentInfos page
            const treatmentInfosPagePromise = this.page.context().waitForEvent('page');
            await editTreatmentInfosButton.click();
            treatmentInfosPage = await treatmentInfosPagePromise;
            await treatmentInfosPage.waitForLoadState('networkidle');

            return new MediOnlinePageWrapper(treatmentInfosPage);
        } catch (error) {
            if (treatmentInfosPage) {
                await treatmentInfosPage.close();
            }

            if (error instanceof MediOnlineError) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
            throw new MediOnlineCreateTreatmentUnknownError(`Erreur inattendue lors de l'ouverture des informations du traitement: ${errorMessage}`);
        }
    }

    /** Add doctor information to the treatment infos page
     * 
     * @param voucher - The voucher data containing doctor information
     * @returns Promise that resolves when doctor info is added
     * @throws MediOnlineDoctorNotFoundError if doctor is not found
     * @throws MediOnlineNavigationError if navigation fails
     */
    async addDoctorInfo(voucher: VoucherData): Promise<void> {
        try {
            // Open the doctor search page
            const searchDoctorPagePromise = this.page.context().waitForEvent('page');
            await this.page.click('input[id="ctl00_CPH_ctl00_uc_vi_presc_011_imgSearch"]');
            const searchDoctorPage = await searchDoctorPagePromise;

            // Fill in doctor search fields
            const cleanedRCC = voucher.doctor_rcc.replace(/[.Xx]/g, '');
            await searchDoctorPage.fill('input[id="ctl00_CPH_ctl00_TextBoxConcordat"]', cleanedRCC);
            await searchDoctorPage.click('input[id="ctl00_CPH_ctl00_btnChercher"]');
            await searchDoctorPage.waitForLoadState('networkidle');

            // Count the number of rows in the search results table
            const resultTable = searchDoctorPage.locator('table#ctl00_CPH_ctl00_DataGrid1 tbody').first();
            const rowCount = await resultTable.locator('> tr').count() - 3;
            if (rowCount < 1) {
                searchDoctorPage.close();
                throw new MediOnlineDoctorNotFoundError(`Le numéro RCC ${voucher.doctor_rcc.toUpperCase()} ne correspond à aucun médecin enregistré.`);
            }

            // Check if result match the extracted doctor name and select it if so
            const resultRow = resultTable.locator('> tr').nth(2);

            const lastNameCell = resultRow.locator('> td').nth(2);
            const firstNameCell = resultRow.locator('> td').nth(3);
            const foundDoctorFullName = await lastNameCell.innerText() + ' ' + await firstNameCell.innerText();

            console.log('FOUND DOCTOR NAME:', foundDoctorFullName);
            if (foundDoctorFullName.toLowerCase() !== voucher.doctor_fullname.toLowerCase()) {
                if (calculateStringSimilarity(voucher.doctor_fullname, foundDoctorFullName) < 0.8) {
                    searchDoctorPage.close();
                    throw new MediOnlineDoctorNotFoundError(`Le nom du médecin trouvé "${foundDoctorFullName}", ne correspond pas à celui fourni "${voucher.doctor_fullname}". Veuillez vérifier le RCC ou le nom du médecin afin de pouvoir enregistrer le bon.`);
                }
                voucher.doctor_fullname = foundDoctorFullName;
            }
            await searchDoctorPage.click('a[id="ctl00_CPH_ctl00_DataGrid1_ctl03_hrefSelect"]');
        } catch (error) {
            if (error instanceof MediOnlineError) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
            throw new MediOnlineCreateTreatmentUnknownError(`Erreur inattendue lors de l'ajout du médecin: ${errorMessage}`);
        }
    }

    async closeTreatmentPage(): Promise<void> {
        try {
            await this.page.locator('input[id="ctl00_CPH_ctl00_btnValider"]').click();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
            throw new MediOnlineCreateTreatmentUnknownError(`Erreur inattendue lors de la fermeture des informations du traitement: ${errorMessage}`);

        }
    }

    async uploadVoucherFile(filePath: string): Promise<void> {
        try {
            // Open the add document page
            const addVoucherPagePromise = this.page.context().waitForEvent('page');
            await this.page.click('input[id="ctl00_CPH_ctl00_ModuleAffichage_Action_btnAddDocument"]');
            const addVoucherPage = await addVoucherPagePromise;

            // Upload the voucher file
            await addVoucherPage.setInputFiles(
                'input[type="file"][name="ctl00$CPH$ctl00$FileUpload1"]',
                filePath
            );

            // Submit the upload
            await addVoucherPage.click('input[id="ctl00_CPH_ctl00__BtnValider"]');
            await addVoucherPage.waitForLoadState('networkidle');
            await addVoucherPage.click('input[id="ctl00_CPH_ctl00_docs_DgnImg_011_btnValider"]');
            await this.page.waitForLoadState('networkidle');
        } catch (error) {
            if (error instanceof MediOnlineError) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
            throw new MediOnlineCreateTreatmentUnknownError(`Erreur lors de l'upload du fichier de bon: ${errorMessage}`);
        }
    }

    getContext(): FrameLocator | Locator | Page {
        return this.context;
    }
}