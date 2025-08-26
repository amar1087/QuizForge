import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useQuizStore } from '@/stores/quizStore';
import { apiRequest } from '@/lib/queryClient';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string | null;
}

export function PurchaseModal({ isOpen, onClose, jobId }: PurchaseModalProps) {
  const { setPurchased, setFullSongUrl, clientId } = useQuizStore();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePurchase = async () => {
    if (!jobId) return;

    setIsProcessing(true);

    try {
      // Create Stripe checkout session
      const response = await apiRequest('POST', '/api/checkout', {
        jobId,
        clientId
      });

      const { sessionUrl } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = sessionUrl;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      toast({
        title: "Payment Failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Check for successful payment on page load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId && jobId) {
      // Verify payment and get download URL
      checkPaymentStatus(sessionId);
    }
  }, [jobId]);

  const checkPaymentStatus = async (sessionId: string) => {
    try {
      const response = await apiRequest('GET', `/api/payment-status?session_id=${sessionId}`);
      const { success, downloadUrl } = await response.json();
      
      if (success) {
        setPurchased(true);
        setFullSongUrl(downloadUrl);
        toast({
          title: "Purchase Successful!",
          description: "Your full song is ready for download",
        });
        onClose();
      }
    } catch (error) {
      console.error('Failed to verify payment:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="purchase-modal-content max-w-md">
        <div className="glass-card rounded-3xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-crown text-2xl text-black"></i>
            </div>
            <h3 className="text-2xl font-bold mb-2">Get Your Full Anthem</h3>
            <p className="text-slate-300">Complete song with high-quality audio and full lyrics</p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center py-3 border-b border-white/10">
              <span>TrashTalk Anthem - Full Song</span>
              <span className="font-semibold">$3.99</span>
            </div>
            <div className="flex justify-between items-center text-sm text-slate-400">
              <span>Processing Fee</span>
              <span>$0.00</span>
            </div>
            <div className="flex justify-between items-center font-bold text-lg pt-2 border-t border-white/10">
              <span>Total</span>
              <span className="text-gold">$3.99</span>
            </div>
          </div>

          <div className="space-y-4">
            <Button
              onClick={handlePurchase}
              disabled={isProcessing || !jobId}
              className="w-full bg-gradient-to-r from-gold to-yellow-500 py-4 rounded-2xl font-bold text-black hover:scale-105 transform transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              data-testid="button-stripe-checkout"
            >
              {isProcessing ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>Processing...
                </>
              ) : (
                <>
                  <i className="fas fa-credit-card mr-2"></i>Pay with Stripe
                </>
              )}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full glass-button py-3 rounded-xl font-semibold"
              data-testid="button-cancel-purchase"
            >
              Cancel
            </Button>
          </div>

          <div className="text-center mt-6 text-xs text-slate-400">
            <p>Secure payment powered by Stripe</p>
            <p>Instant download after payment</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
