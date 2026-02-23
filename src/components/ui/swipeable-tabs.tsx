/**
 * SwipeableTabs — Adds swipe gesture navigation to Radix Tabs
 * 
 * Wraps tab content area with framer-motion drag detection.
 * On mobile (pointer: coarse), users can swipe left/right between tabs.
 */

import React, { useCallback } from "react";
import { motion, PanInfo } from "framer-motion";

interface SwipeableTabsProps {
  children: React.ReactNode;
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
  /** Minimum swipe distance in px to trigger tab change */
  threshold?: number;
}

export function SwipeableTabsContent({
  children,
  tabs,
  activeTab,
  onTabChange,
  className,
  threshold = 50,
}: SwipeableTabsProps) {
  const currentIndex = tabs.indexOf(activeTab);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x < -threshold && currentIndex < tabs.length - 1) {
        onTabChange(tabs[currentIndex + 1]);
      } else if (info.offset.x > threshold && currentIndex > 0) {
        onTabChange(tabs[currentIndex - 1]);
      }
    },
    [currentIndex, tabs, onTabChange, threshold]
  );

  return (
    <motion.div
      className={className}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.15}
      onDragEnd={handleDragEnd}
      style={{ touchAction: "pan-y" }}
    >
      {children}
    </motion.div>
  );
}

export default SwipeableTabsContent;
