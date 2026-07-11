export type {
  AttendeeKind,
  CheckInStatus,
  AttendanceSettings,
  CheckInResult,
  AttendanceSlotPayload,
  TimeslotAttendanceRecord,
  AttendanceSlotAttendee,
  AttendanceSlotSummary,
  AttendanceAnswer,
  RegistrantAttendanceRow,
  AttendanceAnswerSummary,
  RegistrationAnswerSummary,
  AttendeeSearchResult,
  SearchAttendeesInput,
  CheckInAttendeeInput,
} from './types';

export type {
  AttendanceSettingsInput,
  UpdateAttendanceSettingsInput,
  AttendanceSlotPayloadInput,
  AttendanceAnswerEntry,
  UpsertAttendanceAnswersInput,
  BulkAttendanceCsvRowInput,
  BulkUpsertAttendanceAnswersInput,
} from './schemas';

export { ATTENDEE_KINDS, CHECK_IN_STATUSES, CHECK_IN_STATUS_LABELS } from './metadata';
export {
  attendanceSettingsSchema,
  updateAttendanceSettingsSchema,
  attendanceSlotPayloadSchema,
  buildTimeslotSelectionSchema,
  upsertAttendanceAnswersSchema,
  buildBulkAttendanceCsvRowSchema,
  buildBulkAttendanceCsvRowsSchema,
  bulkUpsertAttendanceAnswersSchema,
} from './schemas';

export {
  parseCsvText,
  buildBulkAttendanceRowsFromCsv,
  type ParseCsvResult,
  type BuildBulkRowsResult,
} from './csv-parser';
