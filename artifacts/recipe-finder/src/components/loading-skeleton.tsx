import { motion } from "framer-motion";
import { ChefHat } from "lucide-react";

export function LoadingSkeleton() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-4xl mx-auto"
    >
      <div className="flex flex-col items-center justify-center py-8 sm:py-12 md:py-16 text-center space-y-4 sm:space-y-6">
        <div className="relative">
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-16 sm:w-20 h-16 sm:h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary"
          >
            <ChefHat className="w-8 sm:w-10 h-8 sm:h-10" />
          </motion.div>
          <motion.div
            animate={{ opacity: [0, 1, 0], y: [0, -20] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            className="absolute -top-2 -right-2 w-4 h-4 bg-secondary rounded-full"
          />
          <motion.div
            animate={{ opacity: [0, 1, 0], y: [0, -30] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
            className="absolute top-2 -left-4 w-3 h-3 bg-primary rounded-full"
          />
        </div>
        
        <div className="space-y-2 px-4">
          <h3 className="text-lg sm:text-2xl font-display text-foreground animate-pulse">Our AI Chef is creating your recipe...</h3>
          <p className="text-xs sm:text-base text-muted-foreground">Gathering ingredients, writing instructions, and setting the table.</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl sm:rounded-3xl shadow-xl border border-border/50 overflow-hidden">
        <div className="h-40 sm:h-64 md:h-80 w-full bg-muted animate-pulse" />
        <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-muted animate-pulse rounded w-full" />
            <div className="h-4 bg-muted animate-pulse rounded w-5/6" />
            <div className="h-4 bg-muted animate-pulse rounded w-4/6" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6 sm:gap-8 md:gap-10">
            <div className="space-y-4">
              <div className="h-8 bg-muted animate-pulse rounded w-1/2 mb-6" />
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
            <div className="space-y-6">
              <div className="h-8 bg-muted animate-pulse rounded w-1/3 mb-6" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-4" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
