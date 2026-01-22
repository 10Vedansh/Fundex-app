import { LegalModal } from "./LegalModal";

interface PrivacyPolicyProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrivacyPolicy({ open, onOpenChange }: PrivacyPolicyProps) {
  return (
    <LegalModal open={open} onOpenChange={onOpenChange} title="Privacy Policy">
      <div className="space-y-6">
        <section>
          <h3 className="text-foreground font-semibold mb-2">1. Introduction</h3>
          <p>
            50Stacks ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains 
            how we collect, use, disclose, and safeguard your information in compliance with the Information 
            Technology Act, 2000 and the Information Technology (Reasonable Security Practices and Procedures 
            and Sensitive Personal Data or Information) Rules, 2011.
          </p>
        </section>

        <section>
          <h3 className="text-foreground font-semibold mb-2">2. Information We Collect</h3>
          <p><strong>Personal Information:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Name and email address (when you create an account)</li>
            <li>Investment preferences (for personalization purposes)</li>
            <li>Usage data and analytics</li>
          </ul>
          <p className="mt-2"><strong>Non-Personal Information:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Browser type and version</li>
            <li>Device information</li>
            <li>IP address (anonymized)</li>
            <li>Pages visited and time spent</li>
          </ul>
        </section>

        <section>
          <h3 className="text-foreground font-semibold mb-2">3. How We Use Your Information</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>To provide and maintain our services</li>
            <li>To personalize your experience</li>
            <li>To improve our platform</li>
            <li>To communicate with you about updates and features</li>
            <li>To ensure security and prevent fraud</li>
          </ul>
        </section>

        <section>
          <h3 className="text-foreground font-semibold mb-2">4. Data Security</h3>
          <p>
            We implement appropriate technical and organizational security measures to protect your personal 
            information against unauthorized access, alteration, disclosure, or destruction. These measures 
            include encryption, secure servers, and access controls.
          </p>
        </section>

        <section>
          <h3 className="text-foreground font-semibold mb-2">5. Data Sharing</h3>
          <p>
            We do not sell, trade, or rent your personal information to third parties. We may share 
            information only in the following circumstances:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>With service providers who assist in operating our platform</li>
            <li>When required by law or legal process</li>
            <li>To protect our rights and safety</li>
          </ul>
        </section>

        <section>
          <h3 className="text-foreground font-semibold mb-2">6. Cookies and Tracking</h3>
          <p>
            We use cookies and similar technologies to enhance your experience, analyze usage patterns, 
            and improve our services. You can control cookie settings through your browser preferences.
          </p>
        </section>

        <section>
          <h3 className="text-foreground font-semibold mb-2">7. Your Rights</h3>
          <p>You have the right to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Access your personal information</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Withdraw consent for data processing</li>
            <li>Lodge complaints with relevant authorities</li>
          </ul>
        </section>

        <section>
          <h3 className="text-foreground font-semibold mb-2">8. Data Retention</h3>
          <p>
            We retain your personal information only for as long as necessary to fulfill the purposes 
            outlined in this policy or as required by law.
          </p>
        </section>

        <section>
          <h3 className="text-foreground font-semibold mb-2">9. Children's Privacy</h3>
          <p>
            Our services are not intended for individuals under 18 years of age. We do not knowingly 
            collect personal information from minors.
          </p>
        </section>

        <section>
          <h3 className="text-foreground font-semibold mb-2">10. Contact Us</h3>
          <p>
            For any privacy-related queries or to exercise your rights, please contact us at: 
            <strong> support@50stacks.com</strong>
          </p>
        </section>

        <p className="text-xs text-muted-foreground mt-6">
          Last updated: January 2025
        </p>
      </div>
    </LegalModal>
  );
}
