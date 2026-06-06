import { useEffect, useState } from 'react';
import { FundexLogo } from '@/components/landing/FundexLogo';

interface AppSplashProps {
  /** ms before onFinish fires. Defaults to 2500. */
  duration?: number;
  onFinish: () => void;
}

/**
 * Full-screen dark navy splash with the CIFRAA logo fading in.
 * Used on mobile-app launch in place of the landing page.
 */
export function AppSplash({ duration = 2500, onFinish }: AppSplashProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const fadeOut = setTimeout(() => setVisible(false), duration - 350);
    const finish = setTimeout(onFinish, duration);
    return () => {
      clearTimeout(fadeOut);
      clearTimeout(finish);
    };
  }, [duration, onFinish]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-300"
      style={{
        background:
          'linear-gradient(145deg, hsl(222, 47%, 6%) 0%, hsl(222, 47%, 11%) 50%, hsl(222, 47%, 8%) 100%)',
        opacity: visible ? 1 : 0,
      }}
    >
      <div
        className="flex flex-col items-center gap-3"
        style={{
          animation: 'cifraa-splash-in 700ms ease-out both',
        }}
      >
        <FundexLogo size="lg" className="!h-28" />
      </div>

      <style>{`
        @keyframes cifraa-splash-in {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
