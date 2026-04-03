import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SecurityService {
  
  setupSecurity() {
    // 1. Block common developer tools keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
      if (e.ctrlKey && (e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C') || e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        return false;
      }
      // Mac equivalents (Cmd+Opt+I, etc.)
      if (e.metaKey && e.altKey && (e.key === 'i' || e.key === 'j' || e.key === 'c')) {
        e.preventDefault();
        return false;
      }
      return true;
    });

    // 2. Deterrent: Disable right-click context menu
    // Note: This prevents the "Inspect" option, but users can still use Ctrl+C to copy text.
    window.addEventListener('contextmenu', (e) => {
      // We only prevent it if the user isn't holding a specific key or if we want to be strict
      // To allow copying, we could check if there's a selection, but usually blocking the menu is the goal.
      e.preventDefault();
      return false;
    });
  }
}
