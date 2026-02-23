/**
 * AnimatedTabsContent — Standard TabsContent with fade+slide transition
 * 
 * Drop-in replacement for TabsContent that adds smooth entry animation.
 * Use for default/always-mounted tabs that don't need lazy loading.
 */

import React from "react";
import { TabsContent } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";

interface AnimatedTabsContentProps extends React.ComponentPropsWithoutRef<typeof TabsContent> {
  /** Current active tab value — pass from parent Tabs state */
  activeValue?: string;
}

const tabVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export function AnimatedTabsContent({ 
  value, 
  activeValue, 
  children, 
  className,
  ...props 
}: AnimatedTabsContentProps) {
  const isActive = activeValue === value;

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
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </TabsContent>
  );
}

export default AnimatedTabsContent;
