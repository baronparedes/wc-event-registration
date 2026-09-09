import { useState } from 'react';

import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, FormInputField, StepIndicator } from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';
import {
  useFormBySlugQuery,
  useFormFieldsQuery,
  useSubmitFormMutation,
} from '@/hooks/domain/forms';
import { type MemberLookupProfile, useMemberLookupQuery } from '@/hooks/domain/members';

export function FormSubmitPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: form, isLoading: formLoading, isError: formError } = useFormBySlugQuery(slug);
  const { data: fields, isLoading: fieldsLoading } = useFormFieldsQuery(form?.id);

  const [activeStep, setActiveStep] = useState<number>(1);
  const [memberId, setMemberId] = useState('');
  const [matchedMember, setMatchedMember] = useState<MemberLookupProfile | null>(null);
  const [memberLookupError, setMemberLookupError] = useState('');

  const [publicInfo, setPublicInfo] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });

  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const memberLookupMutation = useMemberLookupQuery();
  const submitFormMutation = useSubmitFormMutation();

  const isLoading = formLoading || fieldsLoading;

  const handleMemberLookup = async () => {
    if (!memberId.trim()) return;
    setMemberLookupError('');
    try {
      const result = await memberLookupMutation.mutateAsync({ memberId: memberId.trim() });
      if (result.profile) {
        setMatchedMember(result.profile);
        setActiveStep(2);
      } else {
        setMemberLookupError('Member not found');
      }
    } catch {
      setMemberLookupError('Failed to verify member ID');
    }
  };

  const handlePublicSubmitStep1 = () => {
    if (form?.audience === 'public' || form?.audience === 'members_and_public') {
      if (!publicInfo.first_name.trim() || !publicInfo.email.trim()) {
        setMemberLookupError('Please fill in required contact information.');
        return;
      }
    }
    setActiveStep(2);
  };

  const handleFieldValueChange = (fieldKey: string, value: unknown) => {
    setResponses((prev) => ({ ...prev, [fieldKey]: value }));
  };

  const handleSubmitForm = async () => {
    if (!slug) return;
    setSubmitError('');

    try {
      await submitFormMutation.mutateAsync({
        form_slug: slug,
        member_id: matchedMember ? memberId.trim() : undefined,
        public_registrant_info: matchedMember ? undefined : publicInfo,
        responses,
        idempotency_key: `form-${slug}-${memberId.trim() || publicInfo.email || 'anon'}-${Date.now()}`,
      });

      setIsSubmitted(true);
      setActiveStep(3);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Failed to submit form.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <p className="mt-2 text-sm text-muted">Loading form...</p>
      </div>
    );
  }

  if (formError || !form) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center space-y-4">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h2 className="text-2xl font-bold text-text">Form Not Found</h2>
        <p className="text-sm text-muted">
          The requested form is not available or has been archived.
        </p>
        <Button onClick={() => navigate(ROUTE_PATHS.forms)}>Back to Forms</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-8 space-y-6">
      <div className="rounded-2xl border border-border bg-surface p-6 space-y-2">
        <h1 className="text-2xl font-bold text-text">{form.title}</h1>
        {form.description && <p className="text-sm text-muted">{form.description}</p>}
      </div>

      <StepIndicator
        currentStep={activeStep}
        totalSteps={3}
        labels={['Identity', 'Fill Details', 'Submitted']}
      />

      {activeStep === 1 && (
        <div className="rounded-2xl border border-border bg-surface p-6 space-y-6">
          <h2 className="text-lg font-semibold text-text">Step 1: Respondent Details</h2>

          {form.audience !== 'public' && (
            <div className="space-y-4 border-b border-border pb-6">
              <h3 className="text-sm font-medium text-text">Member Verification</h3>
              <FormInputField
                label="Member ID"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                placeholder="Enter your Member ID"
              />
              {memberLookupError && (
                <p className="text-xs font-medium text-red-600">{memberLookupError}</p>
              )}
              <Button
                type="button"
                variant="default"
                onClick={handleMemberLookup}
                disabled={memberLookupMutation.isPending}
              >
                {memberLookupMutation.isPending ? 'Verifying...' : 'Verify Member'}
              </Button>
            </div>
          )}

          {(form.audience === 'public' || form.audience === 'members_and_public') && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-text">
                Or Continue as Guest / Public Respondent
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormInputField
                  label="First Name"
                  value={publicInfo.first_name}
                  onChange={(e) => setPublicInfo({ ...publicInfo, first_name: e.target.value })}
                  required
                />
                <FormInputField
                  label="Last Name"
                  value={publicInfo.last_name}
                  onChange={(e) => setPublicInfo({ ...publicInfo, last_name: e.target.value })}
                  required
                />
              </div>
              <FormInputField
                label="Email"
                type="email"
                value={publicInfo.email}
                onChange={(e) => setPublicInfo({ ...publicInfo, email: e.target.value })}
                required
              />
              <FormInputField
                label="Phone (Optional)"
                value={publicInfo.phone}
                onChange={(e) => setPublicInfo({ ...publicInfo, phone: e.target.value })}
              />

              <Button type="button" variant="default" onClick={handlePublicSubmitStep1}>
                Continue to Form Questions
              </Button>
            </div>
          )}
        </div>
      )}

      {activeStep === 2 && (
        <div className="rounded-2xl border border-border bg-surface p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-lg font-semibold text-text">Step 2: Form Questions</h2>
              <p className="text-xs text-muted mt-0.5">
                Respondent:{' '}
                {matchedMember
                  ? `${matchedMember.full_name || matchedMember.first_name} (${memberId.trim()})`
                  : `${publicInfo.first_name} ${publicInfo.last_name} (${publicInfo.email})`}
              </p>
            </div>
            <Button size="sm" variant="primaryOutline" onClick={() => setActiveStep(1)}>
              Change Respondent
            </Button>
          </div>

          {fields?.length === 0 ? (
            <p className="text-sm text-muted">No questions required for this form.</p>
          ) : (
            <div className="space-y-4">
              {fields?.map((field) => (
                <div key={field.id} className="space-y-1">
                  <label className="block text-sm font-medium text-text">
                    {field.label} {field.is_required && <span className="text-red-500">*</span>}
                  </label>

                  {field.field_type === 'textarea' ? (
                    <textarea
                      rows={3}
                      onChange={(e) => handleFieldValueChange(field.field_key, e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                    />
                  ) : field.field_type === 'select' || field.field_type === 'radio' ? (
                    <select
                      onChange={(e) => handleFieldValueChange(field.field_key, e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-accent"
                    >
                      <option value="">Select an option...</option>
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : field.field_type === 'checkbox' ? (
                    <input
                      type="checkbox"
                      onChange={(e) => handleFieldValueChange(field.field_key, e.target.checked)}
                      className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                    />
                  ) : (
                    <FormInputField
                      type={
                        field.field_type === 'email'
                          ? 'email'
                          : field.field_type === 'date'
                            ? 'date'
                            : 'text'
                      }
                      value={String(responses[field.field_key] ?? '')}
                      onChange={(e) => handleFieldValueChange(field.field_key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {submitError && <p className="text-sm text-red-600 font-medium">{submitError}</p>}

          <div className="pt-4 border-t border-border flex justify-end gap-3">
            <Button variant="primaryOutline" onClick={() => setActiveStep(1)}>
              Back
            </Button>
            <Button
              variant="default"
              onClick={handleSubmitForm}
              disabled={submitFormMutation.isPending}
            >
              {submitFormMutation.isPending ? 'Submitting...' : 'Submit Form'}
            </Button>
          </div>
        </div>
      )}

      {activeStep === 3 && isSubmitted && (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center space-y-4">
          <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
          <h2 className="text-2xl font-bold text-text">Form Submitted Successfully!</h2>
          <p className="text-sm text-muted">Thank you! Your response has been recorded.</p>
          <div className="pt-4 flex justify-center gap-3">
            <Button variant="default" onClick={() => navigate(ROUTE_PATHS.forms)}>
              Back to Forms
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
