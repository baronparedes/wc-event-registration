## 2024-10-27 - Information Leakage in Supabase Edge Functions Error Responses

**Vulnerability:** Public Supabase Edge functions (`get-public-form`, `get-public-event-listing`, `get-public-event`, `get-public-event-fields`, `get-public-forms`, `get-public-form-fields`) were inadvertently passing raw internal `error.message` strings directly to the client within HTTP 500 error responses.
**Learning:** Returning unhandled database or system errors to the client exposes underlying architectural details, database schemas, and potential unhandled states which could be leveraged for targeted attacks.
**Prevention:** To avoid this in the future, internal errors must always be sanitized at the edge. Detailed errors should only be logged internally using `console.error` and generic, non-descriptive error messages should be returned to the client using `sharedErrorResponse`.
