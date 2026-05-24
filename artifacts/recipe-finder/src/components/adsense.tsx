import React, { useEffect, useRef } from 'react';

export function AdSense() {
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
        (window as any).adsbygoogle.push({});
      }
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, []);

  return (
    <div className="w-full flex justify-center my-8 overflow-hidden">
      {/* 
        This is a placeholder for the AdSense ad. 
        Replace client with the user's actual AdSense Publisher ID.
      */}
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minWidth: '320px', height: '100px', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}
        data-ad-client={import.meta.env.VITE_ADSENSE_CLIENT || "ca-pub-1234567890123456"}
        data-ad-slot={import.meta.env.VITE_ADSENSE_SLOT || "1234567890"}
        data-ad-format="auto"
        data-full-width-responsive="true"
        ref={adRef}
      />
    </div>
  );
}
