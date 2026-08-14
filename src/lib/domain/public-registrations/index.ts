/**
 * Public registrations domain
 * Handles non-member event registration data and types
 */

export type {
  PublicRegistration,
  PublicRegistrationSummary,
  RegistrationStatus,
  PublicRegistrationAnswer,
  PublicAttendeeInfo,
  SubmitPublicRegistrationRequest,
  SubmitPublicRegistrationResult,
  PublicRegistrationCheckResult,
  PublicRegistrationNotFoundResult,
  CancelPublicRegistrationRequest,
  CancelPublicRegistrationResult,
} from './types';

export {
  publicAttendeeInfoSchema,
  buildSubmitPublicRegistrationSchema,
  publicAttendeeCheckSchema,
  cancelPublicRegistrationSchema,
  buildBulkPublicRegistrationCsvRowSchema,
  buildBulkPublicRegistrationCsvRowsSchema,
  type BulkPublicRegistrationCsvRow,
  type PublicAttendeeInfoInput,
  type PublicAttendeeCheckInput,
  type CancelPublicRegistrationInput,
} from './schemas';

export {
  parsePublicRegistrationCsvText,
  buildBulkPublicRegistrationRowsFromCsv,
  type ParsedPublicRegistrationCsv,
  type ParsePublicRegistrationCsvResult,
  type BulkPublicRegistrationCsvRowInput,
  type BuildBulkPublicRegistrationRowsResult,
} from './csv-parser';
