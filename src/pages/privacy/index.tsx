import { LEGAL_CONFIG } from '@/config/constants/legal';

export function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 rounded-2xl border border-border bg-surface p-6 shadow-xs sm:p-10">
      <header className="space-y-2 border-b border-border pb-6">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-text sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted">
          Last updated: {LEGAL_CONFIG.lastUpdated} | Effective date: {LEGAL_CONFIG.effectiveDate}
        </p>
      </header>

      <div className="space-y-6 text-text leading-relaxed">
        <section className="space-y-3">
          <h2 className="font-heading text-xl font-semibold text-text">1. Introduction</h2>
          <p className="text-sm sm:text-base">
            Welcome to {LEGAL_CONFIG.appName} (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;).
            We respect your privacy and are committed to protecting the personal data you share with
            us. This Privacy Policy explains how we collect, use, disclose, and safeguard your
            information when you visit our website, sign in using Google OAuth or other sign-in
            methods, and register for events managed through our platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-semibold text-text">
            2. Information We Collect
          </h2>
          <p className="text-sm sm:text-base">
            We collect information that you provide directly to us when registering for events,
            authenticating into the platform, or interacting with our services:
          </p>
          <ul className="list-disc space-y-2 pl-6 text-sm sm:text-base">
            <li>
              <strong>Account & Profile Data:</strong> When you sign in using single sign-on (such
              as Google OAuth), we receive profile data including your email address, full name, and
              profile image URL as permitted by your OAuth provider settings.
            </li>
            <li>
              <strong>Event Registration Data:</strong> Information you submit when registering for
              events, such as contact details, attendance preferences, and event-specific responses.
            </li>
            <li>
              <strong>Technical & Usage Data:</strong> Basic technical logs, IP address, device /
              browser header information, and session data required for service security and rate
              limiting.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-semibold text-text">
            3. How We Use Your Information
          </h2>
          <p className="text-sm sm:text-base">
            We use the personal information we collect for legitimate administrative and operational
            purposes, including:
          </p>
          <ul className="list-disc space-y-2 pl-6 text-sm sm:text-base">
            <li>Authenticating your identity and providing access to administrative features.</li>
            <li>Processing event registrations and managing event attendance records.</li>
            <li>Sending event confirmations, updates, and essential administrative notices.</li>
            <li>
              Maintaining system security, preventing unauthorized access, and rate limiting
              requests.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-semibold text-text">
            4. Google User Data & OAuth Scopes
          </h2>
          <p className="text-sm sm:text-base">
            If you authenticate using Google OAuth, our platform accesses basic profile data (such
            as your name and email address) solely to verify your identity and manage authorized
            access. We do not use Google user data for advertising, marketing, or third-party data
            brokerage. We comply strictly with Google&apos;s API Services User Data Policy,
            including Limited Use requirements.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-semibold text-text">
            5. Sharing & Disclosure of Information
          </h2>
          <p className="text-sm sm:text-base">
            We do not sell, rent, or trade your personal information. We only share information in
            the following limited circumstances:
          </p>
          <ul className="list-disc space-y-2 pl-6 text-sm sm:text-base">
            <li>
              <strong>Authorized Event Administrators:</strong> Event managers and coordinators
              responsible for managing attendance and logistics for events you register for.
            </li>
            <li>
              <strong>Service Providers:</strong> Secure infrastructure providers (such as hosting
              and database services) operating under strict data protection terms.
            </li>
            <li>
              <strong>Legal Compliance:</strong> When required by applicable law, regulation, or
              legal process.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-semibold text-text">
            6. Data Security & Retention
          </h2>
          <p className="text-sm sm:text-base">
            We implement industry-standard administrative, physical, and technical safeguards to
            protect your personal information against unauthorized access, loss, or alteration. We
            retain personal data only for as long as necessary to fulfill event registration and
            administrative obligations or as required by law.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-semibold text-text">7. Your Rights</h2>
          <p className="text-sm sm:text-base">
            Depending on your jurisdiction, you may have rights regarding your personal information,
            including the right to request access, correction, or deletion of your data. You can
            exercise these rights by contacting us using the contact details below.
          </p>
        </section>

        <section className="space-y-3 border-t border-border pt-6">
          <h2 className="font-heading text-xl font-semibold text-text">8. Contact Us</h2>
          <p className="text-sm sm:text-base">
            If you have questions, concerns, or requests regarding this Privacy Policy or our data
            handling practices, please contact us at:
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
