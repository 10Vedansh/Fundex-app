import { FundCardSkeleton } from './FundCardSkeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export function DashboardLoadingState() {
  return (
    <div className="space-y-6">
      {/* Hero Loading Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="py-8 flex flex-col items-center justify-center gap-4">
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="relative"
            >
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              <div className="relative bg-gradient-to-br from-primary to-primary/50 p-4 rounded-full">
                <TrendingUp className="h-8 w-8 text-primary-foreground" />
              </div>
            </motion.div>
            <div className="text-center">
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-lg font-semibold text-foreground"
              >
                Analyzing Top Mutual Funds
              </motion.p>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-sm text-muted-foreground mt-1"
              >
                Crunching performance metrics, risk ratios & sector allocations...
              </motion.p>
            </div>
            
            {/* Animated Progress Bar */}
            <div className="w-full max-w-xs h-1.5 bg-secondary/50 rounded-full overflow-hidden mt-2">
              <motion.div
                className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                style={{ width: "50%" }}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Skeleton Fund Cards with Stagger Animation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.4,
              delay: i * 0.1,
              ease: "easeOut"
            }}
          >
            <FundCardSkeleton />
          </motion.div>
        ))}
      </div>

      {/* Stats Skeletons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              duration: 0.3,
              delay: 0.6 + i * 0.05 
            }}
          >
            <Card className="glass-card">
              <CardContent className="py-4 space-y-2">
                <Skeleton className="h-3 w-20 bg-muted/30" />
                <Skeleton className="h-6 w-16 bg-muted/50" />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
