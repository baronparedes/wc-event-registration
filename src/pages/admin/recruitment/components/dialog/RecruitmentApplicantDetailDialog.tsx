import { useState } from 'react';

import { Archive, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

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
import {
  useAdminRecruitmentApplicationDetailQuery,
  useUpdateRecruitmentStageMutation,
} from '@/hooks/domain/recruitment';
import { RECRUITMENT_STEPS, type RecruitmentApplication } from '@/lib/domain/recruitment';

import { ApplicantProfilePanel } from './ApplicantProfilePanel';
import { ArchiveApplicantConfirmDialog } from './ArchiveApplicantConfirmDialog';
import { BiblicalSurveyReviewPanel } from './BiblicalSurveyReviewPanel';
import { DGroupEndorsementPanel } from './DGroupEndorsementPanel';
import { PipelineHistoryPanel } from './PipelineHistoryPanel';
import { PipelineStepsPanel } from './PipelineStepsPanel';

interface RecruitmentApplicantDetailDialogProps {
  application: RecruitmentApplication | null;
  isOpen: boolean;
  onClose: () => void;
}

type DialogTab = 'pipeline' | 'survey' | 'endorsement' | 'profile' | 'history';

const TAB_OPTIONS: Array<{ value: DialogTab; label: string }> = [
  { value: 'pipeline', label: '9-Step Pipeline' },
  { value: 'survey', label: 'Biblical Survey' },
  { value: 'endorsement', label: 'DGroup Endorsement' },
  { value: 'profile', label: 'Applicant Profile' },
  { value: 'history', label: 'Transaction History' },
];

export function RecruitmentApplicantDetailDialog({
  application,
  isOpen,
  onClose,
}: RecruitmentApplicantDetailDialogProps) {
  const [activeTab, setActiveTab] = useState<DialogTab>('pipeline');
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [archiveMode, setArchiveMode] = useState<'archive' | 'restore'>('archive');

  const updateStageMutation = useUpdateRecruitmentStageMutation();

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
  const isArchived = currentApp.status === 'archived';

  const handleOpenArchiveDialog = (mode: 'archive' | 'restore') => {
    setArchiveMode(mode);
    setIsArchiveDialogOpen(true);
  };

  const handleConfirmArchive = async (notes?: string) => {
    try {
      await updateStageMutation.mutateAsync({
        action: archiveMode === 'archive' ? 'archive_applicant' : 'restore_applicant',
        application_id: currentApp.id,
        notes: notes || undefined,
      });
      toast.success(
        archiveMode === 'archive'
          ? `Archived ${currentApp.full_name}`
          : `Restored ${currentApp.full_name} to active`,
      );
      setIsArchiveDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    }
  };

  return (
    <>
      <Dialog isOpen={isOpen} onClose={onClose} size="4xl">
        <Dialog.Header showCloseButton onClose={onClose}>
          <div className="flex items-center gap-3 w-full pr-6">
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
                {isArchived ? (
                  <Badge variant="destructive">Archived</Badge>
                ) : (
                  <Badge variant="secondary">
                    Step {currentApp.current_step}: {stepMeta?.shortLabel}
                  </Badge>
                )}
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
              {activeTab === 'endorsement' && (
                <DGroupEndorsementPanel
                  application={currentApp}
                  endorsement={detailData?.dgroup_endorsement}
                />
              )}
              {activeTab === 'profile' && <ApplicantProfilePanel application={currentApp} />}
              {activeTab === 'history' && (
                <PipelineHistoryPanel application={currentApp} transactions={transactions} />
              )}
            </>
          )}
        </Dialog.Body>

        <Dialog.Footer className="sm:justify-between">
          {isArchived ? (
            <Button
              type="button"
              variant="primaryOutline"
              size="md"
              onClick={() => handleOpenArchiveDialog('restore')}
              className="gap-1.5 justify-center"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Restore to Active</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => handleOpenArchiveDialog('archive')}
              className="gap-1.5 text-danger hover:text-danger hover:bg-danger/10 border-danger/40 justify-center"
            >
              <Archive className="h-4 w-4" />
              <span>Archive</span>
            </Button>
          )}

          <Button
            type="button"
            variant="primaryOutline"
            size="md"
            onClick={onClose}
            className="justify-center"
          >
            Close
          </Button>
        </Dialog.Footer>
      </Dialog>

      {isArchiveDialogOpen && (
        <ArchiveApplicantConfirmDialog
          isOpen={isArchiveDialogOpen}
          onClose={() => setIsArchiveDialogOpen(false)}
          onConfirm={handleConfirmArchive}
          isPending={updateStageMutation.isPending}
          mode={archiveMode}
          applicant={{
            name: `${currentApp.full_name}${currentApp.nickname ? ` (${currentApp.nickname})` : ''}`,
            email: currentApp.email,
            phone: currentApp.phone || undefined,
            role,
            currentStep: currentApp.current_step,
            avatarObjectKey: currentApp.avatar_object_key,
          }}
        />
      )}
    </>
  );
}
