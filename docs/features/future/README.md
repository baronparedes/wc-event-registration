# Future Features Roadmap

This folder contains planned features not yet implemented in the Event Registration Platform. These features represent the product roadmap and prioritization for post-launch phases.

## Overview

**Current Status**: Phase 6 (Hardening and Extensibility) - Gates C and D in progress

**Time Horizon**: Planned for implementation after production readiness gates are passed and initial launch is stable.

## Future Features (Planned)

### 8.1 Event Scoping - Admin Limited to Their Events

**Priority**: High | **Complexity**: Medium | **Effort**: 3-4 weeks  
**Depends on**: Base admin architecture (complete)

Admin access control for multi-tenant support. Large organizations can have multiple admins, each managing their own set of events without visibility into others' data.

**Business value**: Supports scaling to organizational deployments; prevents accidental cross-event contamination.

**Key scenarios**:

- Global admins see all events (current behavior)
- Event-scoped admins see only assigned events
- Assignment managed by super-admin
- Event-scoped admins cannot create unscoped events

---

### 8.2 Asynchronous CSV Export for Large Registrations

**Priority**: Medium | **Complexity**: Medium | **Effort**: 2-3 weeks  
**Depends on**: Current synchronous export (complete); async job queue infrastructure needed

Background job processing for CSV exports. Instead of blocking the UI, exports are queued and delivered via background processing.

**Business value**: Enables exporting 10,000+ registrations without timeout; better UX for large datasets; reduces server load spikes.

**Key scenarios**:

- Export queued asynchronously
- Export status shown in "Exports" section
- Email notification when ready
- Exports expire after 7 days (auto-cleanup)
- Progress bar for in-progress exports

---

### 8.3 Analytics Dashboard and Reporting

**Priority**: High | **Complexity**: High | **Effort**: 4-5 weeks  
**Depends on**: Data collection baseline; aggregation functions

Business intelligence dashboard showing registration trends, completion rates, demographic breakdowns, and anomalies.

**Business value**: Enables data-driven event planning and ROI analysis; identifies registration bottlenecks; early warning system for low registration.

**Key scenarios**:

- Main dashboard with key metrics (total, rate, status breakdown)
- Event-specific analytics (registrations by day, field responses)
- Custom report builder
- Scheduled reports (weekly/monthly email)
- Export as PDF/Excel
- Anomaly alerts (sudden registration drops)

---

### 8.4 Member Import - Bulk CSV Upload

**Priority**: Medium | **Complexity**: Low-Medium | **Effort**: 2-3 weeks  
**Depends on**: CSV export (complete) for reference format

Bulk import of member data from CSV. Admins can seed the member database instead of manually creating each member.

**Business value**: Faster onboarding for organizations with existing member lists; reduces data entry burden; enables integration with external member databases.

**Key scenarios**:

- Upload CSV with member data
- Validation before import (required fields, uniqueness, format)
- Preview and confirm
- Duplicate handling (skip or update)
- Import log and error reporting
- CSV template download for reference

---

### 8.5 Role-Based Field Visibility

**Priority**: Medium | **Complexity**: Medium-High | **Effort**: 3-4 weeks  
**Depends on**: Dynamic field system (complete); member roles (partially implemented)

Configure registration fields to show/hide based on member role. Different member types (Attendee, Volunteer, Staff) see different forms for the same event.

**Business value**: Customized registration flows for different participant types; reduces cognitive load (members see only relevant fields); supports complex event scenarios.

**Key scenarios**:

- Configure field visibility by role
- Member sees only role-appropriate fields
- Responses collected per role
- Admin sees all responses with role context
- Export includes role information for reference

---

### 8.7 Combined Registrations View

**Priority**: Low | **Complexity**: Medium | **Effort**: 2-3 hours  
**Depends on**: Current separate registration pages (complete)

Unified registration list combining member registrations and public guest registrations on a single admin page.

**Business value**: Reduces navigation friction; single source of truth for total event attendance; simplifies search/filtering across registration types.

**Key scenarios**:

- Admin navigates to Registrations page and sees all attendees sorted by name
- Can search across all attendees (members and guests)
- Clicking a row opens the appropriate detail page based on type
- Pagination works correctly across combined dataset
- Export includes both registration types with type indicators

---

## Prioritization Framework

Priorities assigned based on:

1. **Impact**: How much business/user value does this add?
2. **Dependencies**: What must be complete first?
3. **Complexity**: How many systems/components does this touch?
4. **Time**: Est. effort required

### Tier 1 (High Priority - Q3-Q4 2026)

- **Analytics Dashboard** (8.3): Enables data-driven decisions; medium risk
- **Event Scoping** (8.1): Enables multi-tenant deployment; medium risk

### Tier 2 (Medium Priority - Q4 2026 - Q1 2027)

- **Member Import** (8.4): Reduces data entry; low risk, straightforward
- **Async CSV Export** (8.2): Improves performance for large datasets; medium risk
- **Role-Based Visibility** (8.5): Enables complex scenarios; higher complexity

## Dependencies and Blockers

### Architectural Requirements

- Async job queue system (for exports 8.2)
- Data aggregation pipeline (for analytics 8.3)
- Member role system hardening (for role-based visibility 8.5)
- Admin scoping permission model (for event scoping 8.1)

### Data/Database

- Audit logging framework (partially done, can be extended)
- Aggregated metrics table (new) for analytics
- Job queue table (new) for async exports

### Frontend/UX

- Analytics charting library (e.g., Recharts, Chart.js)
- Import CSV drag-drop component
- Role management UI

## Estimated Timeline

**Assuming**:

- 1-2 engineers working part-time on features after launch
- Phase 6 hardening/launch takes 4-6 weeks
- Post-launch stabilization takes 2 weeks

**Roadmap**:

- **Q3 2026** (July-September): Launch (Phase 6 + Gate D), stabilize
- **Q4 2026** (October-December): Analytics (8.3) + Event Scoping (8.1)
- **Q1 2027** (January-March): Member Import (8.4) + Async Export (8.2)
- **Q2 2027** (April-June): Role-Based Visibility (8.5) + Q1 learnings

---

## How to Propose New Features

1. Check existing features (docs/features/) and future list
2. Write feature using Gherkin format (see [../README.md](../README.md) for template)
3. Include: business value, priority justification, dependencies, estimated effort
4. Submit for review with product/stakeholder alignment
5. Add to future/ folder once approved

---

## Feedback and Questions

For questions about planned features:

- Ask product team about priority/timeline
- Check implementation plan (docs/implementation-plan.md) for phase alignment
- Review Gate requirements to understand blockers

---

**Last Updated**: 2026-06-28  
**Next Review**: After Phase 6 completion and launch
