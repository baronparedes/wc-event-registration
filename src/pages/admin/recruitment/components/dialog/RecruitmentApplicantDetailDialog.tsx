import { useState } from 'react';

import {
  Badge,
  Button,
  ButtonGroup,
  type ButtonGroupOption,
  Dialog,
  Spinner,
} from '@/components/ui';
import { useAdminRecruitmentApplicationDetailQuery } from '@/hooks/domain/recruitment';
import { RECRUITMENT_STEPS, type RecruitmentApplication } from '@/lib/domain/recruitment';

import { ApplicantProfilePanel } from './ApplicantProfilePanel';
import { BiblicalSurveyReviewPanel } from './BiblicalSurveyReviewPanel';
import { PipelineStepsPanel } from './PipelineStepsPanel';

interface RecruitmentApplicantDetailDialogProps {
  application: RecruitmentApplication | null;
  isOpen: boolean;
  onClose: () => void;
}

type DialogTab = 'pipeline' | 'survey' | 'profile';

const TAB_OPTIONS: ButtonGroupOption<DialogTab>[] = [
  { value: 'pipeline', label: '9-Step Pipeline' },
  { value: 'survey', label: 'Biblical Survey' },
  { value: 'profile', label: 'Applicant Profile' },
];

export function RecruitmentApplicantDetailDialog({
  application,
  isOpen,
  onClose,
}: RecruitmentApplicantDetailDialogProps) {
  const [activeTab, setActiveTab] = useState<DialogTab>('pipeline');

  const { data: detailData, isLoading } = useAdminRecruitmentApplicationDetailQuery(
    application?.id ?? '',
    isOpen && !!application?.id,
  );

  if (!application) return null;

  // Use fresh detail data when available, otherwise initial application prop
  const currentApp = detailData?.application ?? application;
  const transactions = detailData?.transactions ?? [];
  const stepMeta = RECRUITMENT_STEPS.find((s) => s.stepNumber === currentApp.current_step);
  const role = currentApp.confirmed_role ?? currentApp.desired_role;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="4xl">
      <Dialog.Header showCloseButton onClose={onClose}>
        <div className="flex flex-wrap items-center gap-2">
          <Dialog.Title>
            {currentApp.full_name} {currentApp.nickname ? `(${currentApp.nickname})` : ''}
          </Dialog.Title>
          <Badge variant="outline">{role}</Badge>
          <Badge variant="secondary" className="font-mono">
            Step {currentApp.current_step}: {stepMeta?.shortLabel}
          </Badge>
        </div>
        <Dialog.Description>
          Application ID: {currentApp.id} · Email: {currentApp.email} · Phone: {currentApp.phone}
        </Dialog.Description>
      </Dialog.Header>

      <div className="mt-4 border-b border-border pb-3">
        <ButtonGroup<DialogTab>
          value={activeTab}
          onChange={(val) => setActiveTab(val as DialogTab)}
          options={TAB_OPTIONS}
          size="sm"
        />
      </div>

      <Dialog.Body>
        {isLoading && !detailData ? (
          <div className="flex min-h-[250px] items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {activeTab === 'pipeline' && (
              <PipelineStepsPanel application={currentApp} transactions={transactions} />
            )}
            {activeTab === 'survey' && <BiblicalSurveyReviewPanel application={currentApp} />}
            {activeTab === 'profile' && <ApplicantProfilePanel application={currentApp} />}
          </>
        )}
      </Dialog.Body>

      <Dialog.Footer>
        <Button variant="primaryOutline" onClick={onClose}>
          Close
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
