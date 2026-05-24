import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";
import { useBackground } from "@/hooks/use-background";
import { BACKGROUND_THEMES } from "@/lib/themes";

export default function Privacy() {
  const { bgIndex } = useBackground();
  const theme = BACKGROUND_THEMES[bgIndex];
  const lastUpdated = "April 26, 2026";

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      <header className="border-b border-border/40 bg-white/60 backdrop-blur-sm px-6 py-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Recipe Finder
        </Link>
      </header>

      <div
        className="py-8 sm:py-12 md:py-16 px-4 text-center relative overflow-hidden transition-all duration-700"
        style={theme.heroStyle}
      >
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 backdrop-blur-sm text-primary font-medium text-sm border border-primary/20 shadow-sm mb-6">
            <Shield className="w-4 h-4" />
            Your privacy matters
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display text-foreground leading-tight">
            Privacy Policy
          </h1>
        </motion.div>
      </div>

      <main className="flex-1 container max-w-3xl mx-auto px-3 sm:px-4 py-8 sm:py-10 md:py-14">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-sm border border-border/50 overflow-hidden"
        >
          <div className="h-2 bg-gradient-to-r from-orange-400 via-amber-400 to-orange-300" />
          <div className="p-6 sm:p-8 md:p-10 space-y-6 text-sm sm:text-base text-foreground/80 leading-relaxed">
            <p className="text-xs text-muted-foreground">Last updated: {lastUpdated}</p>

            <section>
              <h2 className="text-xl sm:text-2xl font-display text-foreground mb-3">1. Introduction</h2>
              <p>
                AI Recipe Finder ("we", "our", or "us") respects your privacy. This Privacy Policy explains
                what information we collect when you use our website and how we use it. By using AI Recipe
                Finder, you agree to the practices described below.
              </p>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-display text-foreground mb-3">2. Information We Collect</h2>
              <p className="mb-2"><strong>Search data:</strong> When you search for a recipe, we store the dish name, your dietary preference, and any allergy information you provide so we can generate accurate results and improve the service.</p>
              <p className="mb-2"><strong>Usage data:</strong> We log basic visit information such as page views, approximate country (derived from your IP address), and an anonymous visitor ID stored in your browser.</p>
              <p><strong>Feedback:</strong> If you leave feedback, we save your rating and any optional name or comment you provide.</p>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-display text-foreground mb-3">3. Cookies & Local Storage</h2>
              <p>
                We use a small amount of browser local storage to remember your preferences (such as your
                cookie consent choice and an anonymous visitor ID). We do not use tracking cookies for
                advertising on our own.
              </p>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-display text-foreground mb-3">4. Advertising (Google AdSense)</h2>
              <p className="mb-2">
                We use Google AdSense to display advertisements. Google and its partners may use cookies and
                similar technologies to serve ads based on your prior visits to this and other websites.
              </p>
              <p className="mb-2">
                Google's use of advertising cookies enables it and its partners to serve ads to you based on
                your visit to our site and/or other sites on the Internet. You may opt out of personalised
                advertising by visiting{" "}
                <a
                  href="https://www.google.com/settings/ads"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:text-primary/80"
                >
                  Google Ads Settings
                </a>{" "}
                or{" "}
                <a
                  href="https://www.aboutads.info"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:text-primary/80"
                >
                  www.aboutads.info
                </a>
                .
              </p>
              <p>
                For users in the European Economic Area, the United Kingdom, or Switzerland, Google complies
                with the IAB Europe Transparency & Consent Framework (TCF v2). We display a consent banner so
                you can accept or reject personalised advertising before any ads are loaded.
              </p>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-display text-foreground mb-3">5. Third-Party Services</h2>
              <p className="mb-2">
                We use the following third-party services that may process limited data on our behalf:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Google AdSense — advertising</li>
                <li>Google Fonts — font delivery</li>
                <li>Google Gemini / OpenAI — AI recipe generation (only the dish name and dietary
                  preferences are sent; no personal data)</li>
                <li>Hosting provider — server logs and analytics</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-display text-foreground mb-3">6. Data Retention</h2>
              <p>
                We retain search and analytics data for as long as the service is operational. You can
                request deletion of any feedback you have submitted by contacting us using the email address
                in the footer.
              </p>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-display text-foreground mb-3">7. Children's Privacy</h2>
              <p>
                Our service is not directed at children under 13. We do not knowingly collect personal
                information from children under 13. If you believe a child has provided us with information,
                please contact us so we can delete it.
              </p>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-display text-foreground mb-3">8. Your Rights</h2>
              <p>
                Depending on your location, you may have the right to access, correct, or delete personal
                information we hold about you. Contact us using the email address in the footer to exercise
                these rights.
              </p>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-display text-foreground mb-3">9. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. The "Last updated" date at the top of
                this page will reflect the most recent revision.
              </p>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-display text-foreground mb-3">10. Contact</h2>
              <p>
                Questions about this Privacy Policy? Email us at{" "}
                <a
                  href="mailto:ayaan.kriplani2212@gmail.com"
                  className="text-primary underline hover:text-primary/80"
                >
                  ayaan.kriplani2212@gmail.com
                </a>
                .
              </p>
            </section>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
