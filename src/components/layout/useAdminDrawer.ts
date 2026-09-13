import { useState } from 'react';

/**
 * Custom hook to manage open/close state logic for the Admin Navigation Drawer.
 */
export function useAdminDrawer(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);

  const openDrawer = () => setIsOpen(true);
  const closeDrawer = () => setIsOpen(false);
  const toggleDrawer = () => setIsOpen((prev) => !prev);

  return {
    isOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    setIsOpen,
  };
}
