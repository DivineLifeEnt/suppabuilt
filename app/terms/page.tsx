import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "SuppaBuilt Studio End User License Agreement — the terms governing access to and use of the platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-full bg-[#0b1016] text-white">
      {/* Nav */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white hover:text-white/80 transition-colors">
          SuppaBuilt
        </Link>
        <nav className="flex items-center gap-6 text-sm text-white/60">
          <Link href="/terms" className="text-white font-medium">Terms</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-3">Legal Document</p>
          <h1 className="text-3xl font-bold mb-3">End User License Agreement</h1>
          <p className="text-white/50 text-sm">
            Effective Date: September 6, 2026 &nbsp;·&nbsp; Last Updated: September 6, 2026
          </p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-white/80 leading-relaxed">
          <p>
            This End User License Agreement (&ldquo;Agreement&rdquo; or &ldquo;EULA&rdquo;) is a legally binding
            agreement governing access to and use of the Suppa Built software platform, website, dashboard,
            applications, and related services (collectively, the &ldquo;Platform&rdquo;). By accessing, logging
            into, or using the Platform, you (&ldquo;User,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;)
            acknowledge that you have read, understood, and agree to be bound by this Agreement. If you do not
            agree, you may not access or use the Platform.
          </p>

          <Section n="1" title="Platform">
            <p>
              The Platform provides business management, construction, mechanical/HVAC, project management,
              customer relationship management, estimating, invoicing, scheduling, document management, blueprint
              and plan management, financial integration, reporting, and related functionality. Certain
              functionality may connect with third-party services, including accounting, payment, cloud storage,
              communications, construction, and other software providers.
            </p>
          </Section>

          <Section n="2" title="License Grant">
            <p>
              Subject to this Agreement, Suppa Built grants you a limited, non-exclusive, non-transferable,
              non-sublicensable, revocable license to access and use the Platform solely for authorized business
              purposes. No ownership interest in the Platform is transferred to you.
            </p>
          </Section>

          <Section n="3" title="Authorized Users">
            <p>
              Each User must: Access may be provided to employees, contractors, customers, vendors,
              subcontractors, administrators, or other authorized parties.
            </p>
            <ul>
              <li>Maintain accurate account information;</li>
              <li>Keep login credentials confidential;</li>
              <li>Use only accounts they are authorized to access;</li>
              <li>Immediately report suspected unauthorized access;</li>
              <li>Comply with applicable laws and company policies; and</li>
              <li>Use Platform information only for legitimate business purposes.</li>
            </ul>
            <p>
              Users are responsible for activity performed through their accounts to the extent permitted by
              applicable law.
            </p>
          </Section>

          <Section n="4" title="Prohibited Uses">
            <p>You may not:</p>
            <ul>
              <li>Access another User&apos;s account without authorization;</li>
              <li>Attempt to bypass authentication or security controls;</li>
              <li>Introduce malware, malicious code, or harmful software;</li>
              <li>Interfere with the Platform&apos;s operation;</li>
              <li>Scrape or systematically extract Platform data without authorization;</li>
              <li>Reverse engineer, decompile, or attempt to derive source code except where applicable law expressly permits it;</li>
              <li>Copy or commercially exploit proprietary Platform components without permission;</li>
              <li>Use the Platform for fraudulent, illegal, deceptive, or unauthorized purposes; or</li>
              <li>Access customer, employee, financial, project, or other confidential information without a legitimate business purpose.</li>
            </ul>
          </Section>

          <Section n="5" title="Customer, Project and Business Data">
            <p>
              The Platform may process information concerning customers, prospects, properties, projects,
              equipment, service calls, estimates, contracts, invoices, payments, employees, subcontractors,
              vendors, plans, blueprints, photographs, documents, communications, and other business records.
              Users must only upload information they are legally authorized to provide and process. Ownership
              of User-provided business data remains with the applicable User, customer, company, or other
              lawful owner. Suppa Built retains all rights in the Platform itself, including its software,
              interfaces, workflows, designs, databases, documentation, and proprietary technology.
            </p>
          </Section>

          <Section n="6" title="Accounting and QuickBooks Integration">
            <p>
              The Platform may integrate with QuickBooks or other accounting platforms. If a User connects an
              accounting account, the User authorizes the Platform to access, receive, transmit, synchronize,
              create, or update information according to the permissions granted during authorization. Depending
              on enabled functionality, this information may include customers, vendors, estimates, invoices,
              payments, expenses, purchase orders, products and services, account information, and financial
              reports. Third-party accounting services remain subject to their own agreements and privacy
              policies. Suppa Built does not guarantee that third-party accounting records will always
              synchronize without interruption or error. Users remain responsible for reviewing accounting
              records and maintaining legally required financial records.
            </p>
          </Section>

          <Section n="7" title="Third-Party Services">
            <p>
              The Platform may integrate with third-party products and APIs. Suppa Built does not control
              third-party services and is not responsible for their independent availability, security
              practices, terms, pricing, changes, outages, or discontinuation. Use of third-party services
              may be governed by separate agreements between the User and the applicable provider.
            </p>
          </Section>

          <Section n="8" title="Documents, Plans and Blueprints">
            <p>
              The Platform may allow Users to upload, store, review, annotate, modify, or share construction
              documents, mechanical plans, blueprints, specifications, photographs, drawings, and related
              files. Users are responsible for confirming that documents used for construction, permitting,
              estimating, installation, engineering, or other professional purposes are current and appropriate
              for their intended use. Unless expressly stated otherwise, the Platform does not replace
              professional architectural, engineering, legal, accounting, or code-compliance review.
            </p>
          </Section>

          <Section n="9" title="Intellectual Property">
            <p>
              The Platform and its underlying software, interfaces, branding, workflows, graphics, databases,
              documentation, functionality, and other proprietary materials are owned by Suppa Built or its
              licensors and are protected by applicable intellectual property laws. Nothing in this Agreement
              grants Users ownership of the Platform or its intellectual property.
            </p>
          </Section>

          <Section n="10" title="Confidentiality">
            <p>
              Users may receive access to confidential information, including customer information, pricing,
              estimates, financial information, employee records, vendor pricing, project documentation,
              business strategies, contracts, and proprietary processes. Users must protect such information
              and may not disclose or use it except as authorized for legitimate business purposes. These
              obligations survive termination of Platform access where applicable.
            </p>
          </Section>

          <Section n="11" title="Security">
            <p>
              Suppa Built may employ administrative, technical, and organizational safeguards intended to
              protect Platform information. No electronic system is completely secure. Users are responsible
              for protecting their devices, passwords, authentication methods, and account access. Suppa Built
              may suspend access when it reasonably believes an account or system presents a security risk.
            </p>
          </Section>

          <Section n="12" title="Availability and Modifications">
            <p>
              Features may be added, modified, suspended, or discontinued as the Platform develops. Suppa
              Built does not guarantee uninterrupted or error-free operation and may perform maintenance or
              updates when reasonably necessary.
            </p>
          </Section>

          <Section n="13" title="Suspension and Termination">
            <p>
              Suppa Built may suspend or terminate access for violations of this Agreement, security concerns,
              unauthorized activity, nonpayment where applicable, legal requirements, or misuse of the
              Platform. Upon termination, the User&apos;s license to access the Platform terminates
              immediately unless otherwise agreed.
            </p>
          </Section>

          <Section n="14" title="Disclaimer of Warranties">
            <p className="uppercase text-sm font-medium text-white/70">
              To the maximum extent permitted by law, the Platform is provided &ldquo;as is&rdquo; and
              &ldquo;as available.&rdquo; Suppa Built disclaims warranties not expressly provided in this
              Agreement, including implied warranties of merchantability, fitness for a particular purpose,
              and non-infringement, to the extent such disclaimers are permitted by law.
            </p>
          </Section>

          <Section n="15" title="Limitation of Liability">
            <p className="uppercase text-sm font-medium text-white/70">
              To the maximum extent permitted by applicable law, Suppa Built and its owners, affiliates,
              officers, employees, contractors, and service providers will not be liable for indirect,
              incidental, special, exemplary, consequential, or punitive damages arising from use of or
              inability to use the Platform. Any limitations contained in this Agreement apply only to the
              extent permitted by applicable law.
            </p>
          </Section>

          <Section n="16" title="Indemnification">
            <p>
              To the extent permitted by law, Users agree to indemnify and hold harmless Suppa Built and its
              affiliates, officers, employees, and representatives from third-party claims arising from the
              User&apos;s unlawful use of the Platform, violation of this Agreement, infringement of
              third-party rights, or unauthorized submission or use of information.
            </p>
          </Section>

          <Section n="17" title="Electronic Communications and Records">
            <p>
              Users consent to receiving Platform-related notices and records electronically where permitted
              by law. Electronic acknowledgments, approvals, records, timestamps, and signatures may be
              maintained through the Platform in accordance with applicable law.
            </p>
          </Section>

          <Section n="18" title="Governing Law">
            <p>
              This Agreement is governed by the laws of the State of Florida, without regard to
              conflict-of-law principles. Any dispute shall be handled in the appropriate state or federal
              courts located in Florida unless another dispute-resolution procedure is established in a
              separate written agreement.
            </p>
          </Section>

          <Section n="19" title="Changes to This Agreement">
            <p>
              Suppa Built may update this Agreement as the Platform or applicable legal requirements change.
              When legally required, Users will receive notice of material changes. Continued use after an
              updated Agreement becomes effective constitutes acceptance where permitted by law.
            </p>
          </Section>

          <Section n="20" title="Entire Agreement">
            <p>
              This Agreement, together with applicable policies and any separate written agreement governing
              Platform access, constitutes the agreement regarding use of the Platform. If a provision is
              determined to be unenforceable, the remaining provisions remain effective.
            </p>
          </Section>

          <Section n="21" title="Contact">
            <p>Questions regarding this Agreement may be directed to:</p>
            <address className="not-italic mt-3 space-y-1 text-white/70">
              <p className="font-semibold text-white">Suppa Built</p>
              <p>Florida, United States</p>
              <p>
                Email:{" "}
                <a href="mailto:legal@suppabuilt.com" className="text-blue-400 hover:text-blue-300 transition-colors">
                  legal@suppabuilt.com
                </a>
              </p>
            </address>
          </Section>

          <div className="mt-12 rounded-lg border border-white/10 bg-white/5 p-6">
            <p className="text-sm font-semibold text-white mb-2">User Acknowledgment</p>
            <p className="text-sm text-white/60">
              By selecting &ldquo;I Agree,&rdquo; creating an account, or accessing the Platform, the User
              acknowledges that they have read, understood, and agree to this End User License Agreement.
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
