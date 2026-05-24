import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, Code2, Heart, Award } from "lucide-react";
import { useBackground } from "@/hooks/use-background";
import { BACKGROUND_THEMES } from "@/lib/themes";

export default function About() {
  const { bgIndex } = useBackground();
  const theme = BACKGROUND_THEMES[bgIndex];

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      {/* Top nav back link */}
      <header className="border-b border-border/40 bg-white/60 backdrop-blur-sm px-6 py-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Recipe Finder
        </Link>
      </header>

      {/* Hero banner — uses the current theme */}
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
            <Heart className="w-4 h-4" />
            About this project
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display text-foreground leading-tight">
            About Us
          </h1>
        </motion.div>
      </div>

      {/* Content */}
      <main className="flex-1 container max-w-3xl mx-auto px-3 sm:px-4 py-8 sm:py-10 md:py-14">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-6"
        >
          {/* Main card */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-sm border border-border/50 overflow-hidden">
            {/* Orange accent strip */}
            <div className="h-2 bg-gradient-to-r from-orange-400 via-amber-400 to-orange-300" />

            <div className="p-6 sm:p-8 md:p-10 space-y-6 sm:space-y-8">
              {/* Intro */}
              <div className="text-center">
                <h2 className="text-2xl sm:text-3xl font-display text-foreground mb-2 sm:mb-3">AI Recipe Finder</h2>
                <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
                  An AI-powered recipe discovery tool that generates personalised recipes for any dish you can imagine — including allergy-safe and vegetarian options.
                </p>
              </div>

              <div className="border-t border-border/40" />

              {/* Info cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="flex flex-col items-center text-center gap-3 p-6 bg-orange-50 rounded-2xl border border-orange-100">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Code2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Created By</p>
                    <p className="font-display text-xl text-foreground">Ayaan Kriplani</p>
                  </div>
                </div>

                <div className="flex flex-col items-center text-center gap-3 p-6 bg-amber-50 rounded-2xl border border-amber-100">
                  <div className="w-12 h-12 rounded-xl bg-amber-400/15 flex items-center justify-center">
                    <Award className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">Affiliation</p>
                    <p className="font-display text-xl text-foreground leading-tight">JPIS Jaipur</p>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">Batch of 2030</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/40" />

              {/* Full statement */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl sm:rounded-2xl px-5 sm:px-8 py-6 sm:py-8 border border-orange-100 text-center shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)]">
                <p className="text-base sm:text-lg md:text-xl text-foreground leading-relaxed font-medium">
                  Welcome! This interactive recipe discovery tool was built by <span className="text-primary font-bold">Ayaan Kriplani</span>, a proud student of <span className="text-primary font-bold">JPIS Jaipur</span> from the <span className="text-primary font-bold">Batch of 2030</span>. It is designed to inspire culinary creativity and make finding your next perfect meal effortless.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-white/60 backdrop-blur-sm py-4 sm:py-6">
        <div className="container max-w-7xl mx-auto px-3 sm:px-4 text-center text-xs sm:text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} AI Recipe Finder · Made with ❤️ by Ayaan Kriplani</p>
        </div>
      </footer>
    </div>
  );
}
