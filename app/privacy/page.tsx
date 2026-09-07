import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "SuppaBuilt Studio Privacy Policy — how we collect, use, and protect your information.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-full bg-[#0b1016] text-white">
      {/* Nav */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white hover:text-white/80 transition-colors">
          SuppaBuilt
        </Link>
        <nav className="flex items-center gap-6 text-sm text-white/60">
          <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          <Link href="/privacy" className="text-white font-medium">Privacy</Link>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-3">Legal Document</p>
          <h1 className="text-3xl font-bold mb-3">Privacy Policy</h1>
          <p className="text-white/50 text-sm">
            Effective Date: September 6, 2026 &nbsp;·&nbsp; Last Updated: September 6, 2026
          </p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-white/80 leading-relaxed">
          <p>
            Suppa Built (&ldquo;Suppa Built,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;)
            respects the privacy of individuals who use our websites, software applications, dashboards, and
            related services (collectively, the &ldquo;Platform&rdquo;). This Privacy Policy explains the
            categories of information we may collect, how we use and disclose that information, and the
            choices available to Users.
          </p>

          <Section n="1" title="Information We Collect">
            <SubSection title="Account Information">
              <ul>
                <li>Name</li>
                <li>Email address</li>
                <li>Telephone number</li>
                <li>Company</li>
                <li>Job title or role</li>
                <li>Username</li>
                <li>Authentication and account information</li>
                <li>User permissions</li>
              </ul>
            </SubSection>

            <SubSection title="Customer and Business Information">
              <p>Users may enter or synchronize information including:</p>
              <ul>
                <li>Customer names and contact information</li>
                <li>Property or service addresses</li>
                <li>Project information</li>
                <li>Estimates and proposals</li>
                <li>Work orders and service records</li>
                <li>Equipment information</li>
                <li>Contracts, invoices, and payment status</li>
                <li>Vendor and subcontractor information</li>
                <li>Communications</li>
                <li>Project photographs, documents, plans, and blueprints</li>
              </ul>
            </SubSection>

            <SubSection title="Financial and Accounting Information">
              <p>
                When accounting integrations such as QuickBooks are enabled, the Platform may process
                authorized accounting information, potentially including: customers, vendors, estimates,
                invoices, payments, expenses, purchase orders, products and services, account information,
                financial reports, and transaction-related records. The specific information accessible
                depends on the permissions authorized by the account owner and the functionality being used.
              </p>
            </SubSection>

            <SubSection title="Employee and Contractor Information">
              <p>
                For workforce-management functionality, we may process information concerning employees and
                contractors, including contact details, job assignments, schedules, work records, documents,
                and authorization levels.
              </p>
            </SubSection>

            <SubSection title="Technical Information">
              <p>We may automatically collect technical information such as:</p>
              <ul>
                <li>IP address</li>
                <li>Browser and device type</li>
                <li>Operating system</li>
                <li>Login information and Platform activity</li>
                <li>Error logs and security events</li>
                <li>Date, time of access, and session information</li>
              </ul>
            </SubSection>
          </Section>

          <Section n="2" title="How We Use Information">
            <p>We may use information to:</p>
            <ul>
              <li>Provide and operate the Platform;</li>
              <li>Authenticate Users;</li>
              <li>Manage customers and projects;</li>
              <li>Create and manage estimates, work orders, invoices, and related records;</li>
              <li>Synchronize authorized third-party services;</li>
              <li>Process or facilitate business transactions;</li>
              <li>Store and manage project documentation;</li>
              <li>Generate reports and analytics;</li>
              <li>Maintain audit and activity records;</li>
              <li>Provide customer support;</li>
              <li>Improve Platform functionality;</li>
              <li>Prevent fraud and unauthorized access;</li>
              <li>Maintain Platform security;</li>
              <li>Comply with legal obligations; and</li>
              <li>Enforce our agreements.</li>
            </ul>
          </Section>

          <Section n="3" title="QuickBooks and Other Integrations">
            <p>
              Users may choose to connect the Platform with third-party services such as QuickBooks. When a
              connection is authorized, the Platform may exchange information with that provider according to
              the permissions approved by the User. Authentication tokens and integration credentials should
              be protected using appropriate security measures and used only for authorized Platform
              functionality. Users may disconnect integrations subject to the functionality provided by the
              applicable third-party service and the Platform. Use of information obtained through
              third-party APIs may also be subject to requirements imposed by those providers.
            </p>
          </Section>

          <Section n="4" title="How We Disclose Information">
            <p>We may disclose information to:</p>
            <ul>
              <li>Authorized Users within the applicable organization;</li>
              <li>Service providers assisting with hosting, infrastructure, security, communications, analytics, storage, or Platform operation;</li>
              <li>Third-party services specifically connected or authorized by the User;</li>
              <li>Professional advisers where reasonably necessary;</li>
              <li>Government authorities when legally required; and</li>
              <li>Parties involved in a merger, acquisition, financing, restructuring, sale of assets, or similar business transaction, subject to applicable law.</li>
            </ul>
            <p>
              We do not sell personal information for money. If our data practices change in a manner that
              constitutes &ldquo;selling&rdquo; or &ldquo;sharing&rdquo; personal information under
              applicable privacy law, we will provide any notices and choices required by law.
            </p>
          </Section>

          <Section n="5" title="Data Security">
            <p>
              We use reasonable administrative, technical, and organizational safeguards designed to protect
              information against unauthorized access, alteration, disclosure, destruction, or loss. These
              measures may include access controls, authentication, encrypted communications, restricted
              credentials, monitoring, backups, and other security practices appropriate to the Platform.
              No system can guarantee absolute security.
            </p>
          </Section>

          <Section n="6" title="Data Retention">
            <p>We retain information for as long as reasonably necessary to:</p>
            <ul>
              <li>Provide the Platform;</li>
              <li>Maintain legitimate business records;</li>
              <li>Satisfy contractual requirements;</li>
              <li>Maintain security and audit records;</li>
              <li>Resolve disputes;</li>
              <li>Enforce agreements; and</li>
              <li>Comply with legal, tax, accounting, and regulatory obligations.</li>
            </ul>
            <p>
              Retention periods may vary depending on the type of information and purpose for which it is
              processed.
            </p>
          </Section>

          <Section n="7" title="Cookies and Similar Technologies">
            <p>
              Our websites and applications may use cookies, local storage, session technologies, or similar
              technologies for authentication, security, preferences, analytics, and Platform functionality.
              Users may be able to control certain cookies through their browser settings, although disabling
              required technologies may prevent portions of the Platform from functioning correctly.
            </p>
          </Section>

          <Section n="8" title="User Choices and Privacy Rights">
            <p>
              Depending on where an individual resides and applicable law, they may have rights concerning
              their personal information, potentially including rights to:
            </p>
            <ul>
              <li>Request access;</li>
              <li>Request correction;</li>
              <li>Request deletion;</li>
              <li>Obtain certain information about data practices;</li>
              <li>Opt out of certain processing; or</li>
              <li>Withdraw certain permissions or consents.</li>
            </ul>
            <p>
              These rights are subject to applicable exceptions, including requirements to maintain business,
              accounting, contractual, security, or legal records. Requests may be submitted using the
              contact information below. We may need to verify the requester&apos;s identity before
              processing a request.
            </p>
          </Section>

          <Section n="9" title="Children's Privacy">
            <p>
              The Platform is intended for business use and is not directed to children under 13. We do not
              knowingly collect personal information directly from children under 13 through consumer-facing
              Platform functionality.
            </p>
          </Section>

          <Section n="10" title="Third-Party Services">
            <p>
              The Platform may contain links to or integrations with third-party services. Those providers
              operate under their own privacy policies and terms. Suppa Built is not responsible for the
              independent privacy practices of third parties.
            </p>
          </Section>

          <Section n="11" title="International Processing">
            <p>
              Information may be processed or stored in jurisdictions different from the location where it
              was originally collected. Where required, appropriate safeguards will be implemented for
              cross-border transfers of personal information.
            </p>
          </Section>

          <Section n="12" title="Business Customers">
            <p>
              When Suppa Built processes personal information on behalf of a business customer, that business
              may determine the purposes and means of processing certain information. Individuals seeking to
              exercise rights regarding information controlled by their employer, contractor, property
              manager, or another business may need to contact that organization directly.
            </p>
          </Section>

          <Section n="13" title="Changes to This Privacy Policy">
            <p>
              We may update this Privacy Policy to reflect changes in the Platform, our business practices,
              third-party integrations, or applicable law. The &ldquo;Last Updated&rdquo; date will identify
              the most recent revision. Additional notice will be provided when required by applicable law.
            </p>
          </Section>

          <Section n="14" title="Contact Us">
            <p>Questions, privacy requests, or concerns may be directed to:</p>
            <address className="not-italic mt-3 space-y-1 text-white/70">
              <p className="font-semibold text-white">Suppa Built</p>
              <p>Florida, United States</p>
              <p>
                Privacy Email:{" "}
                <a href="mailto:privacy@suppabuilt.com" className="text-blue-400 hover:text-blue-300 transition-colors">
                  privacy@suppabuilt.com
                </a>
              </p>
            </address>
          </Section>

          <div className="mt-12 rounded-lg border border-white/10 bg-white/5 p-6">
            <p className="text-sm font-semibold text-white mb-2">Privacy Acknowledgment</p>
            <p className="text-sm text-white/60">
              By using the Platform, Users acknowledge that information will be handled as described in
              this Privacy Policy, subject to applicable law.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/10 px-6 py-8 mt-16">
        <div className="mx-auto max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/40">
          <p>&copy; {new Date().getFullYear()} Suppa Built. All rights reserved.</p>
          <nav className="flex gap-6">
            <Link href="/terms" className="hover:text-white/70 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white/70 transition-colors">Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-white mb-3">
        {n}. {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold text-white/90 mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
