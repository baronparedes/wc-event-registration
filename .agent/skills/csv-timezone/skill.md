# CSV Imports/Exports & Timezone Handling

**Context:** This skill defines standard conventions for CSV files and date parsing relative to the application's timezone.

**Instructions:**

- **File Naming:** Attendance CSV export filenames must strictly follow the `event-{eventId}-{type}-{timestamp}.csv` naming convention.
- **Timezone Assumptions:** Service Attendance CSV imports (and generic date parsing logic) assume timestamps are already in Philippine Time (UTC+8).
- **ISO Formatting:** When appending timezone suffixes to format raw date strings into ISO strings, you must use `+08:00` instead of `Z`. Using `Z` will result in frontend double-offset conversions and cause dates to display incorrectly.
