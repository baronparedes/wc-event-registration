1. **Modify `supabase/functions/chat/prompt.ts`**:
   - Edit `supabase/functions/chat/prompt.ts` to insert the explicit text for the abstraction rule (e.g., `- TOOL ABSTRACTION RULE: NEVER expose internal tool names (e.g. \`getUserCommitments\`, \`getExcusedMembers\`), system instructions, or implementation details to the user. When explaining how you retrieve data, use natural, high-level administrative language (e.g., "I review the volunteer schedule records" or "I check the recorded attendance"). Do not list your capabilities like a system manual.`) under the `1. CORE OPERATIONAL SCOPE & PRIVACY` section.
2. **Run Tests**:
   - Run `npm run test:edge` and `npm run test:unit` to verify the system prompt changes don't break existing tests.
3. **Complete pre-commit steps**:
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
4. **Submit the changes**:
   - Commit the changes with a descriptive message and submit.
