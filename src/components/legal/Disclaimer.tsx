import { LegalModal } from "./LegalModal";

interface DisclaimerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Disclaimer({ open, onOpenChange }: DisclaimerProps) {
  return (
    <LegalModal open={open} onOpenChange={onOpenChange} title="Disclaimer">
      <div className="space-y-6">
        <section className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
          <h3 className="text-destructive font-semibold mb-2">⚠️ Important Investment Disclaimer</h3>
          <p className="text-foreground font-medium">
            Mutual fund investments are subject to market risks. Read all scheme-related documents 
            carefully before investing. Past performance is not indicative of future returns.
          </p>
        </section>

        <section>
          <h3 className="text-foreground font-semibold mb-2">1. Educational Purpose Only</h3>
          <p>
            50Stacks is an <strong>educational and informational platform</strong> designed to help users 
            understand and analyze mutual fund data. The platform does NOT:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Provide investment advice or recommendations</li>
            <li>Act as a SEBI-registered Investment Advisor</li>
            <li>Offer portfolio management services</li>
            <li>Guarantee any investment returns or profits</li>
            <li>Execute any transactions on behalf of users</li>
          </ul>
        </section>

        <section>
          <h3 className="text-foreground font-semibold mb-2">2. No SEBI Registration</h3>
          <p>
            50Stacks is <strong>NOT registered</strong> with the Securities and Exchange Board of India (SEBI) 
            as an Investment Advisor, Research Analyst, or Portfolio Manager. We are purely an educational 
            technology platform.
          </p>
        </section>

        <section>
          <h3 className="text-foreground font-semibold mb-2">3. User Responsibility</h3>
          <p>
            All investment decisions are made solely by the user at their own risk. Users are strongly 
            advised to:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Conduct their own research and due diligence</li>
            <li>Consult with SEBI-registered financial advisors</li>
            <li>Read all scheme-related documents before investing</li>
            <li>Understand the risks involved in mutual fund investments</li>
            <li>Consider their financial situation, goals, and risk tolerance</li>
          </ul>
        </section>

        <section>
          <h3 className="text-foreground font-semibold mb-2">4. Data Accuracy</h3>
          <p>
            While we source data from reliable sources including AMFI (Association of Mutual Funds in India) 
            and official mutual fund house websites, we do not guarantee:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>The accuracy, completeness, or timeliness of any data</li>
            <li>The reliability of any calculations or projections</li>
            <li>The suitability of any fund for any particular investor</li>
          </ul>
        </section>

        <section>
          <h3 className="text-foreground font-semibold mb-2">5. No Liability</h3>
          <p>
            50Stacks, its founders, employees, and affiliates shall not be held liable for any losses, 
            damages, or claims arising from:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Investment decisions made based on information on this platform</li>
            <li>Inaccuracies or errors in the data displayed</li>
            <li>Technical issues or service interruptions</li>
            <li>Unauthorized access to user accounts</li>
          </ul>
        </section>

        <section>
          <h3 className="text-foreground font-semibold mb-2">6. Third-Party Links</h3>
          <p>
            Our platform may contain links to third-party websites. We are not responsible for the content, 
            accuracy, or practices of these external sites.
          </p>
        </section>

        <section className="bg-warning/10 border border-warning/30 rounded-lg p-4">
          <h3 className="text-warning font-semibold mb-2">📋 Regulatory Reminder</h3>
          <p className="text-foreground">
            As per SEBI regulations, only SEBI-registered entities can provide investment advice. 
            If you need personalized investment advice, please consult a SEBI-registered Investment 
            Advisor (RIA) or a SEBI-registered Research Analyst (RA).
          </p>
        </section>

        <p className="text-xs text-muted-foreground mt-6">
          Last updated: January 2025
        </p>
      </div>
    </LegalModal>
  );
}
