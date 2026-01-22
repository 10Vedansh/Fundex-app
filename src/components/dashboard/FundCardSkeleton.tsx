import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function FundCardSkeleton() {
  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2 pr-10">
            <Skeleton className="h-5 w-16 bg-primary/10" />
            <Skeleton className="h-5 w-20 bg-success/10" />
          </div>
          <Skeleton className="h-6 w-4/5 bg-muted/50" />
          <Skeleton className="h-3 w-24 bg-muted/30" />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4 mt-4">
          {/* CAGR Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-16 bg-muted/30" />
            <Skeleton className="h-7 w-20 bg-success/20" />
          </div>

          {/* Volatility Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-16 bg-muted/30" />
            <Skeleton className="h-7 w-16 bg-muted/40" />
          </div>

          {/* Sharpe Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-12 bg-muted/30" />
            <Skeleton className="h-7 w-14 bg-muted/40" />
          </div>

          {/* Expense Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-14 bg-muted/30" />
            <Skeleton className="h-7 w-16 bg-muted/40" />
          </div>
        </div>

        {/* Bottom Stats Skeleton */}
        <div className="mt-4 pt-4 border-t border-border/50 flex justify-between">
          <Skeleton className="h-3 w-20 bg-muted/30" />
          <Skeleton className="h-3 w-24 bg-muted/30" />
        </div>
      </CardContent>
    </Card>
  );
}
