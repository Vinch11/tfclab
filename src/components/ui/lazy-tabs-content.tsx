/**
 * LazyTabsContent — Deferred rendering with animated transitions
 * 
 * Only mounts children when the tab is first activated.
 * Once mounted, keeps content alive (no re-mount on tab switch).
 * Includes framer-motion fade+slide transition on activation.
 */

import React, { useState, useEffect } from "react";
import { TabsContent } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

interface LazyTabsContentProps extends React.ComponentPropsWithoutRef<typeof TabsContent> {
  /** Current active tab value — pass from parent Tabs state */
  activeValue?: string;
  /** Show a loading spinner on first mount */
  showLoader?: boolean;
}

const tabVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export function LazyTabsContent({ 
  value, 
  activeValue, 
  children, 
  showLoader = false,
  className,
  ...props 
}: LazyTabsContentProps) {
  const [hasBeenActive, setHasBeenActive] = useState(false);
  const isActive = activeValue === value;

  useEffect(() => {
    if (isActive && !hasBeenActive) {
      setHasBeenActive(true);
    }
  }, [isActive, hasBeenActive]);

  return (
    <TabsContent value={value} className={className} {...props}>
      <AnimatePresence mode="wait">
        {isActive && (
          <motion.div
            key={`tab-${value}`}
            variants={tabVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {hasBeenActive ? children : (
              showLoader ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : null
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </TabsContent>
  );
}

export default LazyTabsContent;
