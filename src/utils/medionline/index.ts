import { chromium, Browser } from 'playwright';
import {
    MediOnlineError,
    MediOnlineCredentialsError,
    MediOnlineLoginError,
    CreateTreatmentSteps,
    MediOnlineCreateTreatmentUnknownError,
    MediOnlineCreateTreatmentStepError,
    AppointmentInfo,
    InvoiceInfo,
} from './medionline.types';
import { MediOnlinePageWrapper } from './mediOnlinePageWrapper';
import { config } from '../../config';
import { parsePatientsPdf, PatientInfo } from '../pdfParser';


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

    async scrapePatientDashboards(
        uploadPatientsData: (patients: PatientInfo[]) => Promise<void>,
        uploadAppointmentsData: (appointments: AppointmentInfo[]) => Promise<void>,
        uploadInvoicesData: (invoices: InvoiceInfo[]) => Promise<void>
    ): Promise<void> {
        if (this.status !== 'connected') {
            throw new MediOnlineError('Cannot query patients when not connected', 'NOT_CONNECTED');
        }

        await this.mpage.searchPatients({ firstName: '', lastName: '', dateOfBirth: '' });
        //await this.mpage.goToPatientDashboard('Alizadeh', 'Abbas', '');
        let currPageIndex = 0;
        let currPatientIndex = 0;

        while (true) {
            const lastPatientOfThePage = await this.mpage.goToPatientInfoPage(currPatientIndex);
            const patientData = await this.mpage.scrapePatientInfos();
            const appointmentsData = await this.mpage.scrapePatientAppointments();
            const invoicesData = await this.mpage.scrapePatientInvoices(patientData.noAvs!);
            await this.mpage.goBack();
            await uploadPatientsData([patientData]);
            await uploadAppointmentsData(appointmentsData);
            await uploadInvoicesData(invoicesData);

            // Try to go to the next patient search page
            if (lastPatientOfThePage) {
                try {
                    await this.mpage.goToPatientSearchPage(++currPageIndex);
                    console.log(`Moving to patient search page ${currPageIndex}`);
                    currPatientIndex = 0;
                } catch {
                    console.log('Finished scaping all the patients');
                    return;
                }
            } else {
                currPatientIndex++;
            }
        }
    }
}

export const mediOnline = new MediOnlineManager(false, 20000);