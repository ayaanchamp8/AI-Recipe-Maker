import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Cookie, X } from "lucide-react";

const STORAGE_KEY = "rf-cookie-consent-v1";

type ConsentChoice = "accepted" | "rejected";

export function getConsentChoice(): ConsentChoice | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "accepted" || v === "rejected" ? v : null;
  } catch {
    return null;
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const choice = getConsentChoice();
    if (!choice) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const save = (choice: ConsentChoice) => {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // ignore
    }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 28 }}
          className="fixed bottom-3 left-3 right-3 sm:bottom-5 sm:left-5 sm:right-auto sm:max-w-md z-50"
          role="dialog"
          aria-live="polite"
          aria-label="Cookie consent"
        >
          <div className="bg-white rounded-xl sm:rounded-2xl border border-border shadow-lg p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Cookie className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-foreground text-sm sm:text-base mb-1">
                  We use cookies
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  We use essential cookies to make the site work and Google AdSense cookies to show
                  relevant ads. See our{" "}
                  <Link
                    href="/privacy"
                    className="text-primary underline hover:text-primary/80 font-medium"
                  >
                    Privacy Policy
                  </Link>
                  .
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => save("rejected")}
                    className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-foreground/70 hover:bg-muted transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => save("accepted")}
                    className="px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    Accept all
                  </button>
                </div>
              </div>
              <button
                onClick={() => save("rejected")}
                aria-label="Close cookie banner"
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
