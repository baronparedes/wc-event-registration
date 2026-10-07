# Pull Request Workflow Rule

AI Agents must **NEVER** approve, auto-merge, or merge Pull Requests into `main` (or any branch).

- **Allowed**: Create feature branches, commit changes, run pre-commit checks, push to remote, and open Pull Requests (`gh pr create`).
- **Forbidden**: Running `gh pr merge`, approving PRs, or fast-forwarding/pushing directly to `main`.
- All PR reviews, approvals, and merges are strictly reserved for the USER.
