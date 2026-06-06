import { LegalModal } from "./LegalModal";

interface TermsAndConditionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TermsAndConditions({ open, onOpenChange }: TermsAndConditionsProps) {
  return (
    <LegalModal open={open} onOpenChange={onOpenChange} title="Terms and Conditions">
      <div className="space-y-6">
        <section>
          <h3 className="text-foreground font-semibold mb-2">1. Acceptance of Terms</h3>
          <p>
            By accessing and using 50Stacks ("the Platform"), you agree to be bound by these Terms and Conditions. 
            If you do not agree to these terms, please do not use our services.
          </p>
        </section>

        <section>
          <h3 className="text-foreground font-semibold mb-2">2. Nature of Services</h3>
          <p>
            50Stacks is an <strong>educational and informational platform</strong> that provides data, analytics, 
            and insights about mutual funds available in India. We do not provide investment advice, portfolio 
            management services, or act as a financial advisor.
          </p>
          <p className="mt-2">
            <strong>Important:</strong> 50Stacks is NOT a SEBI-registered Investment Advisor, Research Analyst, 
            or Portfolio Manager. The information provided on this platform should not be construed as investment advice.
          </p>
        </section>

        <section>
          <h3 className="text-foreground font-semibold mb-2">3. No Investment Advice</h3>
          <p>
            The content on 50Stacks is for informational and educational purposes only. Nothing on this platform 
            constitutes financial, investment, legal, or tax advice. Users should consult with qualified 
            professionals before making any investment decisions.
          </p>
        </section>

        <section>
          <h3 className="text-foreground font-semibold mb-2">4. No Guarantee of Returns</h3>
          <p>
            <strong>Mutual fund investments are subject to market risks. Read all scheme-related documents carefully 
            before investing.</strong> Past performance is not indicative of future results. We do not guarantee 
            any returns or profits from investments made based on information available on this platform.
          </p>
        </section>

        <section>
          <h3 className="text-foreground font-semibold mb-2">5. Data Sources</h3>
          <p>
            The mutual fund data displayed on 50Stacks is sourced from publicly available APIs and official 
            sources including AMFI (Association of Mutual Funds in India). While we strive to provide accurate 
            and up-to-date information, we do not guarantee the accuracy, completeness, or timeliness of the data.
          </p>
        </section>

        <section>
          <h3 className="text-foreground font-semibold mb-2">6. User Responsibilities</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Verify all information independently before making investment decisions</li>
            <li>Consult with SEBI-registered advisors for personalized advice</li>
            <li>Understand that all investment decisions are made at your own risk</li>
            <li>Not rely solely on the information provided on this platform</li>
          </ul>
        </section>

        <section>
          <h3 className="text-foreground font-semibold mb-2">7. Intellectual Property</h3>
          <p>
            All content, design, logos, and trademarks on 50Stacks are the property of their respective owners. 
            Unauthorized use, reproduction, or distribution is prohibited.
          </p>
        </section>

        <section>
          <h3 className="text-foreground font-semibold mb-2">8. Limitation of Liability</h3>
          <p>
            50Stacks, its founders, employees, and affiliates shall not be liable for any direct, indirect, 
            incidental, consequential, or punitive damages arising from the use of this platform or reliance 
            on any information provided herein.
          </p>
        </section>

        <section>
          <h3 className="text-foreground font-semibold mb-2">9. Governing Law</h3>
          <p>
            These Terms and Conditions are governed by the laws of India. Any disputes arising from the use 
            of this platform shall be subject to the exclusive jurisdiction of courts in India.
          </p>
        </section>

        <section>
          <h3 className="text-foreground font-semibold mb-2">10. Changes to Terms</h3>
          <p>
            We reserve the right to modify these Terms and Conditions at any time. Continued use of the 
            platform after changes constitutes acceptance of the modified terms.
          </p>
        </section>

        <p className="text-xs text-muted-foreground mt-6">
          Last updated: January 2025
        </p>
      </div>
    </LegalModal>
  );
}
