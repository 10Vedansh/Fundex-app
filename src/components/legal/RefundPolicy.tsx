import { LegalModal } from "./LegalModal";

interface RefundPolicyProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RefundPolicy({ open, onOpenChange }: RefundPolicyProps) {
  return (
    <LegalModal open={open} onOpenChange={onOpenChange} title="Refund & Cancellation Policy">
      <div className="space-y-6">
        <section>
          <h3 className="text-foreground font-semibold mb-2">1. Free Service</h3>
          <p>
            50Stacks is currently offered as a <strong>free educational platform</strong>. Since no payments 
            are collected for using our services, this refund policy is provided for transparency and in 
            compliance with regulatory requirements.
          </p>
        </section>

        <section>
          <h3 className="text-foreground font-semibold mb-2">2. Future Paid Services</h3>
          <p>
            Should we introduce any paid features or subscription plans in the future, the following 
            refund policy will apply:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Refund requests must be made within 7 days of purchase</li>
            <li>Refunds will be processed to the original payment method</li>
            <li>Processing time: 5-7 business days</li>
            <li>No refunds for partially used subscription periods</li>
          </ul>
        </section>

        <section>
          <h3 className="text-foreground font-semibold mb-2">3. Cancellation</h3>
          <p>
            Users can cancel their account at any time by contacting us at support@50stacks.com. 
            Upon cancellation:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Access to the platform will be terminated</li>
            <li>Personal data will be deleted as per our Privacy Policy</li>
            <li>Any saved portfolios or watchlists will be permanently removed</li>
          </ul>
        </section>

        <section>
          <h3 className="text-foreground font-semibold mb-2">4. Contact for Queries</h3>
          <p>
            For any questions regarding refunds or cancellations, please contact us at: 
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
