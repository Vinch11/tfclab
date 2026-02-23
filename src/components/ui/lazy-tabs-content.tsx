/**
 * LazyTabsContent — Deferred rendering wrapper for Radix TabsContent
 * 
 * Only mounts children when the tab is first activated.
 * Once mounted, keeps content alive (no re-mount on tab switch).
 * This reduces initial render cost for cards with multiple heavy tabs.
 */

import React, { useState, useEffect, useRef } from "react";
import { TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LazyTabsContentProps extends React.ComponentPropsWithoutRef<typeof TabsContent> {
  /** Current active tab value — pass from parent Tabs state */
  activeValue?: string;
  /** Show a loading spinner on first mount */
  showLoader?: boolean;
}

export function LazyTabsContent({ 
  value, 
  activeValue, 
  children, 
  showLoader = false,
  className,
  ...props 
}: LazyTabsContentProps) {
  const [hasBeenActive, setHasBeenActive] = useState(false);

  useEffect(() => {
    if (activeValue === value && !hasBeenActive) {
      setHasBeenActive(true);
    }
  }, [activeValue, value, hasBeenActive]);

  return (
    <TabsContent value={value} className={className} {...props}>
      {hasBeenActive ? children : (
        showLoader ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : null
      )}
    </TabsContent>
  );
}

export default LazyTabsContent;
