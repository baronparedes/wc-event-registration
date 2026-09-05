import { LEGAL_CONFIG } from '@/config/constants/legal';

export function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 rounded-2xl border border-border bg-surface p-6 shadow-xs sm:p-10">
      <header className="space-y-2 border-b border-border pb-6">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-text sm:text-4xl">
          Terms of Service
        </h1>
        <p className="text-sm text-muted">
          Last updated: {LEGAL_CONFIG.lastUpdated} | Effective date: {LEGAL_CONFIG.effectiveDate}
        </p>
      </header>

      <div className="space-y-6 text-text leading-relaxed">
        <section className="space-y-3">
          <h2 className="font-heading text-xl font-semibold text-text">1. Acceptance of Terms</h2>
          <p className="text-sm sm:text-base">
            By accessing or using {LEGAL_CONFIG.appName} (&quot;Platform&quot;), you agree to be
            bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms,
            you may not access or use our services.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-semibold text-text">2. Description of Service</h2>
          <p className="text-sm sm:text-base">
            {LEGAL_CONFIG.appName} provides event registration, attendance tracking, and administrative
            management features. Services may include user authentication via single sign-on
            (such as Google OAuth) and public event registration forms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-semibold text-text">
            3. User Accounts & Responsibilities
          </h2>
          <p className="text-sm sm:text-base">
            To access certain administrative features, you may be required to sign in using
            authorized credentials. You are responsible for maintaining the confidentiality of your
            account and credentials and for all activities that occur under your account.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-semibold text-text">4. Acceptable Use</h2>
          <p className="text-sm sm:text-base">
            You agree not to misuse the Platform or assist anyone else in doing so. Specifically,
            you agree not to:
          </p>
          <ul className="list-disc space-y-2 pl-6 text-sm sm:text-base">
            <li>Submit false, misleading, or fraudulent registration data.</li>
            <li>Attempt to bypass authentication, security controls, or system rate limits.</li>
            <li>Interfere with or disrupt the performance or integrity of the Platform.</li>
            <li>Use the Platform for any unlawful or unauthorized purpose.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-semibold text-text">
            5. Intellectual Property
          </h2>
          <p className="text-sm sm:text-base">
            All rights, title, and interest in and to the Platform, including software, design, logos,
            and content, remain the exclusive property of {LEGAL_CONFIG.organizationName} or its
            licensors.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-semibold text-text">
            6. Disclaimer of Warranties & Limitation of Liability
          </h2>
          <p className="text-sm sm:text-base">
            The Platform is provided on an &quot;as is&quot; and &quot;as available&quot; basis
            without warranties of any kind, express or implied. To the maximum extent permitted by
            law, {LEGAL_CONFIG.organizationName} shall not be liable for any indirect, incidental,
            or consequential damages arising out of or in connection with your use of the Platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-semibold text-text">7. Changes to Terms</h2>
          <p className="text-sm sm:text-base">
            We reserve the right to update or modify these Terms at any time. Any changes will become
            effective upon posting the revised Terms on this page. Your continued use of the Platform
            after changes are posted constitutes your acceptance of the updated Terms.
          </p>
        </section>

        <section className="space-y-3 border-t border-border pt-6">
          <h2 className="font-heading text-xl font-semibold text-text">8. Contact Us</h2>
          <p className="text-sm sm:text-base">
            If you have any questions regarding these Terms of Service, please contact us at:
          </p>
          <p className="text-sm font-medium text-text sm:text-base">
            Email:{' '}
            <a
              href={`mailto:${LEGAL_CONFIG.contactEmail}`}
              className="text-primary underline hover:opacity-80"
            >
              {LEGAL_CONFIG.contactEmail}
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
