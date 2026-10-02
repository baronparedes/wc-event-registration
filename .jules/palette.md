## 2025-02-18 - Loading State Spinners in Buttons

**Learning:** Replaced text-only loading indicators (e.g. "Saving...") with a standardized spinner (`Loader2` from `lucide-react`) within the `<Button>` component for several async dialogs and forms. This provides consistent, recognizable visual feedback indicating background activity.
**Action:** Always include a visual spinner (`<Loader2 className="mr-2 h-4 w-4 animate-spin" />`) alongside text changes for loading/pending states on primary action buttons across the application to improve UX and communicate system state clearly.

## 2026-10-02 - Loading Spinners & Tooltips in Drawer

**Learning:** The push notification action buttons ('Enable', 'Turn off') and 'Mark all as read' lacked visual spinner indicators for loading states in NotificationDrawer.tsx. Added `Loader2` to async actions inside NotificationDrawer and added a `title` to the drawer's Close button for native tooltip.
**Action:** Ensure that all primary asynchronous interactions (not just forms/dialogs but also side-drawers and notification panels) utilize `Loader2` or a similar indicator inside buttons instead of relying purely on disabled state or text swaps.

## 2025-02-18 - Loading State Spinners in Buttons

**Learning:** Replaced text-only loading indicators (e.g. "Saving...") with a standardized spinner (`Loader2` from `lucide-react`) within the `<Button>` component for several async dialogs and forms. This provides consistent, recognizable visual feedback indicating background activity.
**Action:** Always include a visual spinner (`<Loader2 className="mr-2 h-4 w-4 animate-spin" />`) alongside text changes for loading/pending states on primary action buttons across the application to improve UX and communicate system state clearly.
