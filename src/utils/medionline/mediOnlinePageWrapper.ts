import { FrameLocator, Locator, Page } from "playwright";
import { promises as fs } from 'fs';
import * as path from 'path';
import { MediOnlineError, MediOnlineInsuranceError, MediOnlineDoctorNotFoundError, MediOnlineMultiplePatientsError, MediOnlinePatientNotFoundError, MediOnlineCreateTreatmentUnknownError } from "./medionline.types";

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

    async downloadPatientsPageDoc(): Promise<string> {
        // Select all patients on the current page & access their pdf export page
        for (let i = 3; i <= 27; i++) {
            try {
                await this.page.click(`input[id="ctl00_CPH_ctl00_PatientSearchResult_GridView1_ctl${i.toString().padStart(2, '0')}_chkSelect"]`, { timeout: 90000 });
            } catch {
                break;
            }
        }

        // Go to export page
        await this.page.click('input[name="ctl00$CPH$ctl00$PatientSearchResult$GridView1$ctl29$ctl02"]', { timeout: 90000 });
        await this.page.waitForLoadState('networkidle');

        // Open PDF in a new page (PDF viewer)
        const pdfViewerPagePromise = this.page.context().waitForEvent('page', { timeout: 90000 });
        await this.page.click('a[id="ctl00_CPH_ctl00_btnPDF"]');
        const pdfViewerPage = await pdfViewerPagePromise;
        await pdfViewerPage.waitForLoadState('networkidle');

        const pdfPath = await this.downloadPdfFromUrl(pdfViewerPage);
        return pdfPath;
    }

    async downloadPdfFromUrl(pdfPage: Page): Promise<string> {
        // Attempt to download the PDF content from the viewer page URL
        try {
            const pdfUrl = pdfPage.url();

            // Use the page's request context to fetch the binary PDF
            // Note: page.request is available in recent Playwright versions.
            const response = await (pdfPage.request).get(pdfUrl, { timeout: 90000 });
            if (!response.ok()) {
                throw new Error(`Failed to fetch PDF. Status: ${response.status()}`);
            }

            const buffer = await response.body();

            // Ensure downloads directory exists
            const downloadsDir = path.join(process.cwd(), 'downloads');
            await fs.mkdir(downloadsDir, { recursive: true });

            const fileName = `patients_${Date.now()}.pdf`;
            const filePath = path.join(downloadsDir, fileName);

            await fs.writeFile(filePath, buffer);

            // Close the viewer page to free resources
            try { await pdfPage.close(); } catch { }

            return filePath;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error while downloading PDF';
            // Close the viewer page if it's still open
            try { await pdfPage.close(); } catch { }
            throw new MediOnlineError(`Failed to download PDF: ${errorMessage}`, 'DOWNLOAD_ERROR');
        }
    }

    async goToNextPatientsPage(): Promise<boolean> {
        return false
    }


    getContext(): FrameLocator | Locator | Page {
        return this.context;
    }
}