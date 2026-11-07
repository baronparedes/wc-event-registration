import type { RecruitmentActionMap } from '../types.ts';
import { handleArchiveApplicant, handleRestoreApplicant } from './archive.ts';
import { handleUploadAvatar } from './avatar.ts';
import { handleSaveCommitments } from './commitments.ts';
import { handleRequestEndorsement, handleResendEndorsement } from './endorsement.ts';
import { handleAddNote } from './notes.ts';
import { handleCancelSchedule } from './scheduleCancel.ts';
import { handleStepRepeat } from './stageRepeat.ts';
import { handleUpdateStage } from './stageTransition.ts';
import { handleCompleteVmt } from './vmt.ts';

export const actionRoutes: RecruitmentActionMap = {
  complete_vmt: {
    requiresReviewer: false,
    handle: handleCompleteVmt,
  },
  save_commitments: {
    requiresReviewer: false,
    handle: handleSaveCommitments,
  },
  resend_endorsement: {
    requiresReviewer: false,
    handle: handleResendEndorsement,
  },
  request_endorsement: {
    requiresReviewer: true,
    handle: handleRequestEndorsement,
  },
  archive_applicant: {
    requiresReviewer: true,
    handle: handleArchiveApplicant,
  },
  restore_applicant: {
    requiresReviewer: true,
    handle: handleRestoreApplicant,
  },
  add_note: {
    requiresReviewer: true,
    handle: handleAddNote,
  },
  upload_avatar: {
    requiresReviewer: true,
    handle: handleUploadAvatar,
  },
  repeat_step: {
    requiresReviewer: true,
    handle: handleStepRepeat,
  },
  return_to_observation: {
    requiresReviewer: true,
    handle: handleStepRepeat,
  },
  return_to_interview: {
    requiresReviewer: true,
    handle: handleStepRepeat,
  },
  update_stage: {
    requiresReviewer: true,
    handle: handleUpdateStage,
  },
  cancel_schedule: {
    requiresReviewer: true,
    handle: handleCancelSchedule,
  },
};
