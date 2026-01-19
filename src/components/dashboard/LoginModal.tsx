import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    onClose();
    navigate('/auth');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md glass-card border-border/50">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">
            Welcome to Fundex
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 py-6">
          <p className="text-center text-muted-foreground text-sm mb-4">
            Sign in to access personalized mutual fund insights
          </p>
          
          <Button 
            onClick={handleLoginClick}
            className="w-full gap-3 bg-primary hover:bg-primary/90"
          >
            Continue to Login
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
