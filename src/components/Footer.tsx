import { useState } from "react";
import { TermsAndConditions } from "./legal/TermsAndConditions";
import { PrivacyPolicy } from "./legal/PrivacyPolicy";
import { Disclaimer } from "./legal/Disclaimer";

export function Footer() {
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  return (
    <>
      <footer className="border-t border-border/40 bg-background/80 backdrop-blur-sm py-8 lg:ml-24">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Main footer content */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Legal links */}
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <button
                onClick={() => setTermsOpen(true)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms & Conditions
              </button>
              <span className="text-border hidden md:inline">|</span>
              <button
                onClick={() => setPrivacyOpen(true)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </button>
              <span className="text-border hidden md:inline">|</span>
              <button
                onClick={() => setDisclaimerOpen(true)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Disclaimer
              </button>
            </div>

            {/* Copyright */}
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} CIFRAA – All rights reserved
            </p>
          </div>

          {/* Mandatory SEBI disclaimer */}
          <div className="mt-6 pt-4 border-t border-border/30">
            <p className="text-xs text-muted-foreground text-center max-w-4xl mx-auto">
              <strong>Disclaimer:</strong> Mutual fund investments are subject to market risks. 
              Read all scheme-related documents carefully before investing. Past performance is not 
              indicative of future returns. CIFRAA is an educational platform and is NOT a 
              SEBI-registered Investment Advisor. We do not provide any investment advice or recommendations.
            </p>
          </div>
        </div>
      </footer>

      {/* Legal modals */}
      <TermsAndConditions open={termsOpen} onOpenChange={setTermsOpen} />
      <PrivacyPolicy open={privacyOpen} onOpenChange={setPrivacyOpen} />
      <Disclaimer open={disclaimerOpen} onOpenChange={setDisclaimerOpen} />
    </>
  );
}
