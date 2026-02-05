import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface FAQModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const faqs = [
  { 
    q: 'What is CIFRAA?', 
    a: 'CIFRAA is an educational platform that helps users explore and understand mutual fund data through clear metrics, visual comparisons, and personalized discovery tools.' 
  },
  { 
    q: 'Is CIFRAA free to use?', 
    a: 'Yes, CIFRAA offers free access to core features including fund analysis, comparisons, watchlist functionality, and portfolio tracking.' 
  },
  { 
    q: 'Does CIFRAA provide investment advice?', 
    a: 'No. CIFRAA provides educational insights and data analysis tools only. We do not offer investment advice or recommendations.' 
  },
  { 
    q: 'How does personalization work?', 
    a: 'During onboarding, you answer questions about your risk tolerance, timeline, and goals. CIFRAA filters funds that align with your profile—not as recommendations, but as relevant options to explore.' 
  },
  { 
    q: 'Where does the data come from?', 
    a: 'CIFRAA aggregates publicly available mutual fund data from AMFI and fund house disclosures. Data is refreshed daily after market close.' 
  },
  { 
    q: 'Is my data secure?', 
    a: 'Yes. We use industry-standard encryption. Your information is stored securely and never shared with third parties.' 
  },
  {
    q: 'How do I add funds to my portfolio?',
    a: 'Search for any fund using the search bar, click on it to view details, then click "Add to Portfolio" to track your investment.'
  },
  {
    q: 'Can I compare multiple funds?',
    a: 'Yes! Go to the Sectors tab to compare two funds side by side, including their sector allocations, risk metrics, and performance data.'
  },
];

export function FAQModal({ isOpen, onClose }: FAQModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Help & FAQ</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, idx) => (
              <AccordionItem 
                key={idx}
                value={`item-${idx}`} 
                className="border border-border/30 rounded-lg px-4 bg-secondary/20 data-[state=open]:bg-secondary/40 transition-colors"
              >
                <AccordionTrigger className="text-left hover:no-underline py-4 text-sm font-medium">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4 text-sm leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </DialogContent>
    </Dialog>
  );
}
