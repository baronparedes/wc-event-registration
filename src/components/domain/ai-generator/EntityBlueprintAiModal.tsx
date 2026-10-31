import { useState } from 'react';

import { AlertCircle, Check, Eye, ListPlus, RotateCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  AiBrandIcon,
  AlertBanner,
  Badge,
  Button,
  Dialog,
  EmptyState,
  FieldTypeBadge,
  FormSelectField,
  FormTextareaField,
  MarkdownRenderer,
  Spinner,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { toRoute } from '@/config/constants';
import {
  useAppendBlueprintFieldsMutation,
  useCreateEventWithBlueprintMutation,
  useCreateFormWithBlueprintMutation,
  useGenerateEntityBlueprintMutation,
} from '@/hooks/domain/ai-generator';
import type {
  BlueprintDynamicField,
  EntityAudience,
  EntityBlueprintDomain,
  EntityBlueprintMetadata,
  GenerateEntityBlueprintResponse,
} from '@/lib/domain/ai-generator';

export interface EntityBlueprintAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain: EntityBlueprintDomain;
  mode?: 'create' | 'append_fields';
  existingEntityId?: string;
  onApplyToForm?: (metadata: EntityBlueprintMetadata, fields: BlueprintDynamicField[]) => void;
  onCreatedSuccess?: (entityId: string, slug: string) => void;
}

const FORM_AUDIENCE_OPTIONS = [
  { value: 'members_and_public', label: 'Members and Public' },
  { value: 'members', label: 'Members Only' },
  { value: 'public', label: 'Public Only' },
];

const EVENT_AUDIENCE_OPTIONS = [
  { value: 'members_and_public', label: 'Members + Public' },
  { value: 'members', label: 'Members' },
  { value: 'public', label: 'Public' },
];

type PreviewTab = 'details' | 'fields';

export function EntityBlueprintAiModal({
  isOpen,
  onClose,
  domain,
  mode = 'create',
  existingEntityId,
  onApplyToForm,
  onCreatedSuccess,
}: EntityBlueprintAiModalProps) {
  const navigate = useNavigate();
  const isEvent = domain === 'event';
  const isAppendingFields = mode === 'append_fields';
  const audienceOptions = isEvent ? EVENT_AUDIENCE_OPTIONS : FORM_AUDIENCE_OPTIONS;
  const audienceFieldLabel = isEvent ? 'Allow Public Registrations' : 'Audience';

  const [prompt, setPrompt] = useState('');
  const [audiencePreference, setAudiencePreference] =
    useState<EntityAudience>('members_and_public');
  const [blueprint, setBlueprint] = useState<GenerateEntityBlueprintResponse | null>(null);
  const [selectedFieldKeys, setSelectedFieldKeys] = useState<Set<string>>(new Set());
  const [previewTab, setPreviewTab] = useState<PreviewTab>('details');

  const generateMutation = useGenerateEntityBlueprintMutation({
    onSuccess: (data) => {
      setBlueprint(data);
      setSelectedFieldKeys(new Set(data.fields.map((f) => f.field_key)));
      setPreviewTab(isAppendingFields ? 'fields' : 'details');
      toast.success(`${isEvent ? 'Event' : 'Form'} blueprint generated!`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to generate blueprint.');
    },
  });

  const createEventMutation = useCreateEventWithBlueprintMutation();
  const createFormMutation = useCreateFormWithBlueprintMutation();
  const appendFieldsMutation = useAppendBlueprintFieldsMutation();

  const isSaving =
    createEventMutation.isPending || createFormMutation.isPending || appendFieldsMutation.isPending;

  const handleClose = () => {
    if (isSaving || generateMutation.isPending) return;
    setPrompt('');
    setBlueprint(null);
    setSelectedFieldKeys(new Set());
    setPreviewTab('details');
    onClose();
  };

  const handleGenerate = () => {
    if (!prompt.trim() || prompt.trim().length < 3) {
      toast.error('Please enter a description or prompt of at least 3 characters.');
      return;
    }

    generateMutation.mutate({
      domain,
      prompt: prompt.trim(),
      audiencePreference,
    });
  };

  const handleToggleField = (fieldKey: string) => {
    setSelectedFieldKeys((prev) => {
      const next = new Set(prev);
      if (next.has(fieldKey)) {
        next.delete(fieldKey);
      } else {
        next.add(fieldKey);
      }
      return next;
    });
  };

  const handleSelectAllFields = () => {
    if (!blueprint) return;
    setSelectedFieldKeys(new Set(blueprint.fields.map((f) => f.field_key)));
  };

  const handleDeselectAllFields = () => {
    setSelectedFieldKeys(new Set());
  };

  const getFilteredFields = (): BlueprintDynamicField[] => {
    if (!blueprint) return [];
    return blueprint.fields.filter((f) => selectedFieldKeys.has(f.field_key));
  };

  const handleCreateBlueprint = async () => {
    if (!blueprint) return;
    const filteredFields = getFilteredFields();

    try {
      if (isEvent) {
        const created = await createEventMutation.mutateAsync({
          metadata: blueprint.metadata,
          fields: filteredFields,
        });
        toast.success(
          `Event "${blueprint.metadata.title}" created with ${filteredFields.length} fields!`,
        );
        handleClose();
        if (onCreatedSuccess) {
          onCreatedSuccess(created.id, created.slug);
        } else {
          navigate(toRoute('adminEventFields', { id: created.id }));
        }
      } else {
        const created = await createFormMutation.mutateAsync({
          metadata: blueprint.metadata,
          fields: filteredFields,
        });
        toast.success(
          `Form "${blueprint.metadata.title}" created with ${filteredFields.length} fields!`,
        );
        handleClose();
        if (onCreatedSuccess) {
          onCreatedSuccess(created.id, created.slug);
        } else {
          navigate(toRoute('adminFormFields', { id: created.id }));
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create entity.');
    }
  };

  const handleAppendFields = async () => {
    if (!blueprint || !existingEntityId) return;
    const filteredFields = getFilteredFields();

    if (filteredFields.length === 0) {
      toast.error('Please select at least one question to add.');
      return;
    }

    try {
      await appendFieldsMutation.mutateAsync({
        domain,
        entityId: existingEntityId,
        fields: filteredFields,
      });
      toast.success(`Added ${filteredFields.length} fields successfully!`);
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to append fields.');
    }
  };

  const handleApplyToFormOnly = () => {
    if (!blueprint || !onApplyToForm) return;
    const filteredFields = getFilteredFields();
    onApplyToForm(blueprint.metadata, filteredFields);
    toast.success('Applied generated details to the form.');
    handleClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="3xl">
      <Dialog.Header showCloseButton onClose={handleClose}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <AiBrandIcon className="h-5 w-5" />
          </div>
          <div>
            <Dialog.Title>
              {isAppendingFields
                ? `Add ${isEvent ? 'Event' : 'Form'} Questions with AI`
                : `${isEvent ? 'Event' : 'Form'} One-Click AI Generator`}
            </Dialog.Title>
            <Dialog.Description>
              {isAppendingFields
                ? `Generate and batch-append custom registration questions using Welcome Hub AI.`
                : `Draft a complete ${isEvent ? 'event' : 'form'} blueprint and dynamic questions in seconds.`}
            </Dialog.Description>
          </div>
        </div>
      </Dialog.Header>

      <Dialog.Body className="space-y-4">
        {!blueprint ? (
          /* Step 1: Input & Configuration */
          <div className="space-y-4">
            <div className="space-y-1.5">
              <FormTextareaField
                id="blueprint-prompt"
                label={
                  isEvent
                    ? 'Describe the Event & Registration Needs'
                    : 'Describe the Form & Required Fields'
                }
                placeholder={
                  isEvent
                    ? 'e.g., Couples Retreat on March 20-22 at CCF Center. Needs spouse name, childcare needs, dietary restrictions, and emergency contact...'
                    : 'e.g., Post-event attendee feedback survey. Needs overall satisfaction rating, favorite session, speaker feedback, and suggestions for future topics...'
                }
                rows={4}
                maxLength={2000}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                helperText={`${prompt.length}/2000 characters`}
                textareaClassName="resize-none"
              />
            </div>

            <FormSelectField
              id="blueprint-audience"
              label={audienceFieldLabel}
              options={audienceOptions}
              value={audiencePreference}
              placeholder=""
              onChange={(val) => setAudiencePreference(val as EntityAudience)}
            />

            {generateMutation.isError && (
              <AlertBanner
                variant="error"
                icon={<AlertCircle className="h-4 w-4 shrink-0" />}
                title="Generation Failed"
                description={
                  generateMutation.error?.message ||
                  'Unable to generate blueprint. Please try again with additional details.'
                }
              />
            )}
          </div>
        ) : (
          /* Step 2: Interactive Blueprint Preview using Tabs */
          <Tabs
            value={previewTab}
            onValueChange={(tab) => setPreviewTab(tab as PreviewTab)}
            className="space-y-4"
          >
            {/* Top Toolbar */}
            <div className="flex flex-col justify-between gap-2 border-b border-border pb-3 sm:flex-row sm:items-center">
              <TabsList className="w-auto">
                <TabsTrigger value="details">General Details</TabsTrigger>
                <TabsTrigger value="fields">Questions ({blueprint.fields.length})</TabsTrigger>
              </TabsList>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setBlueprint(null)}
                disabled={isSaving}
              >
                <RotateCw className="mr-1.5 h-3.5 w-3.5" />
                Change Prompt
              </Button>
            </div>

            {/* Tab 1: General Details */}
            <TabsContent value="details" className="mt-2 space-y-3">
              <div className="rounded-xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
                  <div>
                    <h3 className="text-base font-bold text-text">{blueprint.metadata.title}</h3>
                    <p className="font-mono text-xs text-muted">slug: {blueprint.metadata.slug}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary">
                      {audienceOptions.find((o) => o.value === blueprint.metadata.audience)
                        ?.label ?? blueprint.metadata.audience}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {blueprint.metadata.duplicate_policy.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>

                {isEvent && (
                  <div className="grid grid-cols-1 gap-3 pt-3 text-xs sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-background p-2.5">
                      <span className="font-semibold text-text">Location: </span>
                      <span className="text-muted">
                        {blueprint.metadata.location || 'CCF Center'}
                      </span>
                    </div>
                    {blueprint.metadata.suggested_duration_hours && (
                      <div className="rounded-lg border border-border bg-background p-2.5">
                        <span className="font-semibold text-text">Suggested Duration: </span>
                        <span className="text-muted">
                          {blueprint.metadata.suggested_duration_hours} hours
                        </span>
                      </div>
                    )}
                    {blueprint.metadata.starts_at && (
                      <div className="rounded-lg border border-border bg-background p-2.5">
                        <span className="font-semibold text-text">Event Schedule: </span>
                        <span className="text-muted">
                          {blueprint.metadata.starts_at.replace('T', ' ')}
                          {blueprint.metadata.ends_at
                            ? ` to ${blueprint.metadata.ends_at.replace('T', ' ')}`
                            : ''}
                        </span>
                      </div>
                    )}
                    {blueprint.metadata.registration_opens_at && (
                      <div className="rounded-lg border border-border bg-background p-2.5">
                        <span className="font-semibold text-text">Registration Window: </span>
                        <span className="text-muted">
                          {blueprint.metadata.registration_opens_at.replace('T', ' ')}
                          {blueprint.metadata.registration_closes_at
                            ? ` to ${blueprint.metadata.registration_closes_at.replace('T', ' ')}`
                            : ''}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1 pt-3">
                  <span className="text-xs font-semibold text-text">Description:</span>
                  <div className="rounded-lg border border-border bg-background p-3 text-xs">
                    <MarkdownRenderer content={blueprint.metadata.description} />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Dynamic Questions & Fields */}
            <TabsContent value="fields" className="mt-2 space-y-3">
              <div className="flex items-center justify-between px-1 text-xs text-muted">
                <span>
                  {selectedFieldKeys.size} of {blueprint.fields.length} questions included
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllFields}
                    className="text-primary hover:underline"
                  >
                    Select All
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllFields}
                    className="text-primary hover:underline"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {blueprint.fields.length === 0 ? (
                <EmptyState
                  icon={<AiBrandIcon className="h-8 w-8 text-primary" />}
                  title="No Questions Generated"
                  description="No custom registration questions were generated for this blueprint."
                />
              ) : (
                <div className="max-h-[50vh] space-y-2.5 overflow-y-auto pr-1">
                  {blueprint.fields.map((field) => {
                    const isSelected = selectedFieldKeys.has(field.field_key);
                    const visibilityRule = field.validation_rules?.visibility_rule as
                      | { depends_on_field_key: string; equals_value: string }
                      | undefined;

                    return (
                      <div
                        key={field.field_key}
                        className={`rounded-xl border p-3.5 transition-colors ${
                          isSelected
                            ? 'border-primary/50 bg-primary/5'
                            : 'border-border bg-surface opacity-60 hover:opacity-80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <span className="text-sm font-semibold text-text">{field.label}</span>
                              <div className="flex items-center gap-1.5">
                                <FieldTypeBadge fieldType={field.field_type} />
                                <Badge
                                  variant={field.is_required ? 'destructive' : 'outline'}
                                  className="px-1.5 py-0 text-[10px]"
                                >
                                  {field.is_required ? 'Required' : 'Optional'}
                                </Badge>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 font-mono text-xs text-muted">
                              <span>key: {field.field_key}</span>
                              {field.placeholder && (
                                <>
                                  <span>•</span>
                                  <span>placeholder: &quot;{field.placeholder}&quot;</span>
                                </>
                              )}
                            </div>

                            {field.options && field.options.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {field.options.map((opt, optIdx) => (
                                  <span
                                    key={optIdx}
                                    className="rounded border border-border bg-background px-2 py-0.5 text-[11px] text-text"
                                  >
                                    {opt.label}
                                  </span>
                                ))}
                              </div>
                            )}

                            {visibilityRule && (
                              <div className="flex items-center gap-1 pt-1 text-[11px] text-primary">
                                <Eye className="h-3 w-3 shrink-0" />
                                <span>
                                  Shows conditionally when{' '}
                                  <strong className="font-mono">
                                    {visibilityRule.depends_on_field_key}
                                  </strong>{' '}
                                  equals &quot;{visibilityRule.equals_value}&quot;
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="shrink-0 pt-0.5">
                            <Switch
                              checked={isSelected}
                              onCheckedChange={() => handleToggleField(field.field_key)}
                              ariaLabel={`Include ${field.label}`}
                              size="sm"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </Dialog.Body>

      <Dialog.Footer>
        <Button
          variant="outline"
          onClick={handleClose}
          disabled={generateMutation.isPending || isSaving}
        >
          Cancel
        </Button>

        {!blueprint ? (
          <Button
            variant="default"
            onClick={handleGenerate}
            disabled={generateMutation.isPending || !prompt.trim()}
          >
            {generateMutation.isPending ? (
              <>
                <Spinner size="sm" />
                <span className="ml-1.5">Generating Blueprint...</span>
              </>
            ) : (
              <>
                <AiBrandIcon className="mr-1.5 h-4 w-4" />
                Generate Blueprint
              </>
            )}
          </Button>
        ) : isAppendingFields ? (
          <Button
            variant="default"
            onClick={handleAppendFields}
            disabled={isSaving || selectedFieldKeys.size === 0}
          >
            {isSaving ? (
              <>
                <Spinner size="sm" />
                <span className="ml-1.5">Adding Questions...</span>
              </>
            ) : (
              <>
                <ListPlus className="mr-1.5 h-4 w-4" />
                Add {selectedFieldKeys.size} Questions
              </>
            )}
          </Button>
        ) : (
          <>
            {onApplyToForm && (
              <Button variant="outline" onClick={handleApplyToFormOnly} disabled={isSaving}>
                Populate Form Only
              </Button>
            )}
            <Button variant="default" onClick={handleCreateBlueprint} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Spinner size="sm" />
                  <span className="ml-1.5">Creating Draft...</span>
                </>
              ) : (
                <>
                  <Check className="mr-1.5 h-4 w-4" />
                  Apply & Create Draft ({selectedFieldKeys.size} fields)
                </>
              )}
            </Button>
          </>
        )}
      </Dialog.Footer>
    </Dialog>
  );
}
