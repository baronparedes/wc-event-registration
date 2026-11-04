import { useState } from 'react';

import {
  Avatar,
  Badge,
  Button,
  Dialog,
  Spinner,
  Tabs,
  TabsList,
  TabsTrigger,
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

const TAB_OPTIONS: Array<{ value: DialogTab; label: string }> = [
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
        <div className="flex items-center gap-3">
          <Avatar
            name={currentApp.full_name}
            avatarObjectKey={currentApp.avatar_object_key}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Dialog.Title>
                {currentApp.full_name} {currentApp.nickname ? `(${currentApp.nickname})` : ''}
              </Dialog.Title>
              <Badge variant="outline">{role}</Badge>
              <Badge variant="secondary">
                Step {currentApp.current_step}: {stepMeta?.shortLabel}
              </Badge>
            </div>
            <Dialog.Description className="truncate">
              {currentApp.email} · {currentApp.phone}
            </Dialog.Description>
          </div>
        </div>
      </Dialog.Header>

      <div className="mt-4 border-b border-border pb-3">
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as DialogTab)}>
          <TabsList containerClassName="justify-start" className="w-auto">
            {TAB_OPTIONS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
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
