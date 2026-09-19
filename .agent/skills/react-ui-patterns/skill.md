# React and UI Patterns

**Context:** This skill covers the conventions for building React UI components in this repository.

**Instructions:**

- **Avoid External UI Libraries:** Avoid pulling in external headless UI libraries for simple components. For example, tabbed interfaces (e.g., Profile or Form Submissions pages) should be implemented using custom React state and standard HTML `<button>` elements styled with Tailwind CSS.
- **Utilize Existing Primitives:** Make use of the existing shared UI primitives in `src/components/ui/` (e.g., `Button`, `Dialog`, `FormInputField`) rather than rebuilding them.
- **Global Toast Notifications:** Use the 'sonner' library for global toast notifications. The primary `<Toaster />` provider component is configured and managed in `src/App.tsx`.
- **Login CTA:** The login page (`/src/pages/login`) strongly prioritizes Google Sign-In as the primary Call-To-Action. To reduce confusion, the traditional email/password form used for admin login is hidden by default and accessible only via a state-toggled toggle button.
