import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { AdminBaseNavigation, AdminPageShell } from '@/components/layout';
import { Button, ButtonGroup, type ButtonGroupOption, Spinner } from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';
import {
  useRecruitmentSettingsQuery,
  useUpdateRecruitmentSettingsMutation,
} from '@/hooks/domain/recruitment';
import { type RecruitmentSettingsInput, recruitmentSettingsSchema } from '@/lib/domain/recruitment';

import { EndorsementQuestionsTab, GeneralSettingsTab, SurveyQuestionsTab } from './components';

type SettingsTab = 'general' | 'survey' | 'endorsement';

const TAB_OPTIONS: ButtonGroupOption<SettingsTab>[] = [
  { value: 'general', label: 'General & Status' },
  { value: 'survey', label: 'Doctrinal Survey Questions' },
  { value: 'endorsement', label: 'DGroup Endorsement Prompts' },
];

export function AdminRecruitmentSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const { data: settings, isLoading, isError, error } = useRecruitmentSettingsQuery();
  const updateMutation = useUpdateRecruitmentSettingsMutation();

  const form = useForm<RecruitmentSettingsInput>({
    resolver: zodResolver(recruitmentSettingsSchema),
    values: settings
      ? {
          is_recruitment_open: settings.is_recruitment_open,
          eligibility_rules: settings.eligibility_rules,
          vmt_registration_url: settings.vmt_registration_url,
          orientation_instructions: settings.orientation_instructions,
          survey_questions: settings.survey_questions,
          endorsement_questions: settings.endorsement_questions,
        }
      : undefined,
    defaultValues: {
      is_recruitment_open: true,
      eligibility_rules: {
        min_age: 18,
        max_age: 45,
        min_dgroup_months: 6,
        requires_glc1_completed: true,
      },
      vmt_registration_url: '',
      orientation_instructions: '',
      survey_questions: [],
      endorsement_questions: [],
    },
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = form;

  const isRecruitmentOpen = useWatch({
    control,
    name: 'is_recruitment_open',
  });

  const onSubmit = (values: RecruitmentSettingsInput) => {
    updateMutation.mutate(values, {
      onSuccess: () => {
        toast.success('Recruitment settings saved successfully');
        reset(values);
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to save recruitment settings');
      },
    });
  };

  return (
    <AdminPageShell wide>
      <AdminPageShell.Header
        title="Volunteer Recruitment Settings"
        description="Configure recruitment intake status, eligibility rules, biblical survey statements, and DGroup Leader attestation prompts."
        breadcrumbs={[
          { label: 'Settings', to: ROUTE_PATHS.adminSettings },
          { label: 'Recruitment Settings' },
        ]}
        actions={
          <Button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={!isDirty || updateMutation.isPending}
            className="w-full sm:w-auto"
          >
            {updateMutation.isPending ? (
              <>
                <Spinner size="sm" className="mr-2" aria-hidden="true" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                Save Settings
              </>
            )}
          </Button>
        }
      />

      <AdminBaseNavigation />

      <AdminPageShell.Filters>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ButtonGroup<SettingsTab>
            value={activeTab}
            onChange={(val) => setActiveTab(val as SettingsTab)}
            options={TAB_OPTIONS}
            size="sm"
          />
        </div>
      </AdminPageShell.Filters>

      <AdminPageShell.Content>
        {(() => {
          if (isLoading) {
            return (
              <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-border bg-surface">
                <Spinner size="lg" />
              </div>
            );
          }
          if (isError) {
            return (
              <div className="rounded-2xl border border-danger/20 bg-danger/5 p-6 text-center text-sm text-danger">
                {error instanceof Error ? error.message : 'Failed to load recruitment settings.'}
              </div>
            );
          }
          return (
            <form onSubmit={handleSubmit(onSubmit)}>
              {activeTab === 'general' && (
                <GeneralSettingsTab
                  control={control}
                  register={register}
                  errors={errors}
                  isRecruitmentOpen={isRecruitmentOpen}
                />
              )}
              {activeTab === 'survey' && (
                <SurveyQuestionsTab control={control} register={register} errors={errors} />
              )}
              {activeTab === 'endorsement' && (
                <EndorsementQuestionsTab control={control} register={register} errors={errors} />
              )}
            </form>
          );
        })()}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
