import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { faqs } from '@/data/faqData';

interface FAQModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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
                <AccordionContent className="text-muted-foreground pb-4 text-sm leading-relaxed whitespace-pre-line">
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
