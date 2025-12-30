import { chromium, Browser } from 'playwright';
import {
    MediOnlineError,
    MediOnlineCredentialsError,
    MediOnlineLoginError,
    AppointmentInfo,
    InvoiceInfo,
    PatientInfo,
    MediOnlinePatientsScraperError,
} from './medionline.types';
import { MediOnlinePageWrapper, SearchPatientsParams } from './mediOnlinePageWrapper';
import { UpsertStats } from '../supabase/supabase.types';
import { config } from '../../config';


class MediOnlineManager {
    private headless: boolean;
    private defaultTimeout: number;

    private browser: Browser = undefined as unknown as Browser;
    private mpage: MediOnlinePageWrapper = undefined as unknown as MediOnlinePageWrapper;
    private status: 'not connected' | 'connecting' | 'connected' = 'not connected';

    constructor(headless: boolean = false, defaultTimeout: number = 10000) {
        this.headless = headless;
        this.defaultTimeout = defaultTimeout;
    }

    /**
     * Login to MediOnline portal
     * 
     * @returns Promise with the authenticated page instance
     * @throws MediOnlineCredentialsError if credentials are missing
     * @throws MediOnlineLoginError if login fails
     */
    async login(username: string, password: string): Promise<void> {
        if (this.status !== 'not connected') {
            return;
        }
        this.status = 'connecting';

        this.browser = await chromium.launch({ headless: this.headless });
        try {
            if (!username || !password) {
                throw new MediOnlineCredentialsError();
            }

            // Launch browser (non-headless for debugging)

            // Navigate to MediOnline
            const context = await this.browser.newContext();
            context.setDefaultTimeout(this.defaultTimeout); // Set default timeout to 10 seconds
            const landingPage = await context.newPage();
            await landingPage.goto(config.medionline.url);


            // Access to the login page
            const loginPagePromise = context.waitForEvent('page');
            await landingPage.click('a.inputBtnLogin', { noWaitAfter: true });
            const loginPage = await loginPagePromise;
            await loginPage.click('.inputBtnLogin');
            await loginPage.click('.apmui-button.apmui-button-submit');

            // Wait for the input fields to be visible and fill them
            await loginPage.waitForSelector('input[name="username"]', { timeout: 5000 });
            await loginPage.fill('input[name="username"]', username);
            await loginPage.fill('input[name="password"]', password);
            await loginPage.click('.apmui-button.apmui-button-submit');

            // Click the "Annuler" button if it appears
            await loginPage.click('button.ui-button.ui-corner-all.ui-widget:has-text("Annuler")').catch(() => { });

            await landingPage.close();
            await loginPage.waitForLoadState('networkidle');

            this.mpage = new MediOnlinePageWrapper(loginPage);
            this.status = 'connected';
            console.log('MediOnline login successful');
        } catch (error) {
            this.status = 'not connected';
            this.browser.close();
            this.browser = undefined as unknown as Browser;
            this.mpage = undefined as unknown as MediOnlinePageWrapper;

            if (error instanceof MediOnlineError) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('MediOnline login error:', errorMessage);
            throw new MediOnlineLoginError(`Erreur lors de la connexion à MediOnline: ${errorMessage}`);
        }
    }

    /**
     * Log out and close the browser
     */
    async logoutAndClose(): Promise<void> {
        if (this.status !== 'connected') {
            throw new MediOnlineError('Cannot logout when not connected', 'NOT_CONNECTED');
        }
        this.browser?.close();
        this.browser = undefined as unknown as Browser;
        this.mpage = undefined as unknown as MediOnlinePageWrapper;
        this.status = 'not connected';
        console.log('MediOnline logged out and browser closed');
    }

    async setSearchParams(params: SearchPatientsParams): Promise<void> {
        if (this.status !== 'connected') {
            throw new MediOnlineError('Cannot set search params when not connected', 'NOT_CONNECTED');
        }
        await this.mpage.searchPatients(params);
    }

    async scrapeSearchedPatients(
        startPageIndex: number,
        startPatientIndex: number,
        uploadFunctions: {
            patients: (patients: PatientInfo[]) => Promise<{ patientId: string; actionType: 'created' | 'updated' | 'skipped' }>,
            appointments: (patientId: string, appointments: AppointmentInfo[]) => Promise<UpsertStats>,
            invoices: (patientId: string, invoices: InvoiceInfo[]) => Promise<UpsertStats>,
            scraperActivity: (patientId: string, pageIndex: number, rowIndex: number, actionType: 'created' | 'updated' | 'skipped') => Promise<void>,
            deletePatient: (patientId: string) => Promise<void>,
        }
    ): Promise<void> {
        if (this.status !== 'connected') {
            throw new MediOnlineError('Cannot query patients when not connected', 'NOT_CONNECTED');
        }

        let currPageIndex = startPageIndex ?? parseInt(process.env.CURR_PAGE_INDEX || '1', 10);
        let currPatientIndex = startPatientIndex ?? parseInt(process.env.CURR_PATIENT_INDEX || '0', 10);

        try {
            while (true) {
                await this.mpage.goToPatientSearchPage(currPageIndex);
                console.log(`\n\nStart scraping page ${currPageIndex}, patient index ${currPatientIndex}`);

                let lastPatientOfThePage = currPatientIndex >= 24;

                let skipScraping = false;
                try {
                    await this.mpage.goToPatientInfoPage(currPatientIndex);
                } catch (error) {
                    if (error instanceof MediOnlineError && error.code === 'TIERS_PATIENT_ROW') {
                        skipScraping = true;
                    } else if (error instanceof MediOnlineError && error.code === 'PATIENT_ROW_NOT_FOUND') {
                        console.log('Last page reached, all data fetched');
                        break;
                    } else {
                        throw error;
                    }
                }

                if (!skipScraping) {
                    let patientId: string | undefined;
                    let wasPatientCreated = false;

                    try {
                        const patientData = await this.mpage.scrapePatientInfos();
                        const result = await uploadFunctions.patients([patientData]);
                        patientId = result.patientId;
                        wasPatientCreated = result.actionType === 'created';

                        // Scrape and upload appointments and invoices
                        const appointmentsData = await this.mpage.scrapePatientAppointments();
                        const invoicesData = await this.mpage.scrapePatientInvoices(patientData.noAvs!);
                        await this.mpage.goBack();

                        const { created: appointmentsCreated, updated: appointmentsUpdated, skipped: appointmentsSkipped, deleted: appointmentsDeleted } = await uploadFunctions.appointments(patientId, appointmentsData);
                        console.log(`Appointments: ${appointmentsCreated} created, ${appointmentsUpdated} updated, ${appointmentsSkipped} skipped (total: ${appointmentsData.length})`);

                        const { created: invoicesCreated, updated: invoicesUpdated, skipped: invoicesSkipped } = await uploadFunctions.invoices(patientId, invoicesData);
                        console.log(`Invoices: ${invoicesCreated} created, ${invoicesUpdated} updated, ${invoicesSkipped} skipped (total: ${invoicesData.length})`);

                        // Track scraper activity with the action type from patient upsert
                        const scraperActionType = wasPatientCreated ? 'created'
                            : (appointmentsCreated > 0 || invoicesCreated > 0 || appointmentsUpdated > 0 || invoicesUpdated > 0 || appointmentsDeleted > 0) ? 'updated'
                                : 'skipped';
                        await uploadFunctions.scraperActivity(patientId, currPageIndex, currPatientIndex, scraperActionType);
                    } catch (error) {
                        // If the patient was created in this iteration but we failed before completing all data insertion,
                        // delete the patient so it can be properly recreated on retry
                        if (wasPatientCreated && patientId) {
                            try {
                                await uploadFunctions.deletePatient(patientId);
                                console.log(`Cleaned up incomplete patient record: ${patientId}`);
                            } catch (deleteError) {
                                console.error('Failed to clean up patient record:', deleteError);
                            }
                        }
                        throw error;
                    }
                }

                // Try to go to the next patient search page
                if (lastPatientOfThePage) {
                    try {
                        await this.mpage.goToPatientSearchPage(++currPageIndex);
                        console.log(`Moving to patient search page ${currPageIndex}`);
                        currPatientIndex = 0;
                    } catch {
                        console.log('Finished scraping all the patients');
                        return;
                    }
                } else {
                    currPatientIndex++;
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new MediOnlinePatientsScraperError(
                `Error scraping patients at page ${currPageIndex}, patient index ${currPatientIndex}: ${errorMessage}`,
                currPageIndex,
                currPatientIndex
            );
        }
    }

}

export const mediOnline = new MediOnlineManager(process.env.HEADLESS_MODE === 'true', 60000);