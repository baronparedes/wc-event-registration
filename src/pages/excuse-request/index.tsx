import { useEffect, useRef, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  RotateCcw,
  Search,
  UserCheck,
} from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import {
  Avatar,
  Badge,
  Button,
  Dialog,
  LoadingState,
  SectionCard,
  Spinner,
  StepIndicator,
  WizardStep,
} from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import {
  type MemberLookupProfile,
  useCurrentProfileQuery,
  useMemberLookupQuery,
} from '@/hooks/domain/members';
import { useSubmitExcuseMutation } from '@/hooks/domain/services';
import { type SubmitServiceExcuseInput } from '@/lib/domain/services';

import { EXCUSE_SERVICE_SLOTS, formatServiceSlots, getUpcomingSundays } from './utils';

// --- Validation Schemas ---
const memberIdLookupSchema = z.object({
  memberId: z.string().trim().min(1, 'Please enter or scan your Member ID'),
});
type MemberIdLookupForm = z.infer<typeof memberIdLookupSchema>;

const nameLookupSchema = z.object({
  name: z.string().trim().min(1, 'Please enter your name').max(200, 'Name is too long'),
});
type NameLookupForm = z.infer<typeof nameLookupSchema>;

const excuseDetailsSchema = z.object({
  request_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Request date must be in YYYY-MM-DD format'),
  services: z.array(z.string().trim().min(1)).min(1, 'Please select at least one service slot'),
  reason: z.string().trim().max(500, 'Reason must be 500 characters or less').optional().nullable(),
});
type ExcuseDetailsForm = z.infer<typeof excuseDetailsSchema>;

export function ExcuseRequestPage() {
  const navigate = useNavigate();
  const authQuery = useAdminAuthQuery();
  const profileQuery = useCurrentProfileQuery();
  const memberLookupMutation = useMemberLookupQuery();
  const submitMutation = useSubmitExcuseMutation();

  // Wizard step state (1: Scan / Lookup, 2: Confirm Details, 3: Excuse Details)
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [matchedMember, setMatchedMember] = useState<MemberLookupProfile | null>(null);
  const [manualMemberId, setManualMemberId] = useState<string>('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [submittedExcuse, setSubmittedExcuse] = useState<SubmitServiceExcuseInput | null>(null);

  const memberIdInputRef = useRef<HTMLInputElement | null>(null);
  const upcomingSundays = getUpcomingSundays(6);

  const isSignedIn = Boolean(authQuery.data?.session && profileQuery.data);
  const currentProfile = profileQuery.data;

  // Auto-detect signed-in volunteer and advance to Step 2
  useEffect(() => {
    let isMounted = true;
    if (isSignedIn && currentProfile && activeStep === 1 && !matchedMember) {
      void Promise.resolve().then(() => {
        if (!isMounted) return;
        setMatchedMember({
          member_token: '',
          user_id: currentProfile.id,
          first_name: currentProfile.full_name?.split(' ')[0] ?? '',
          last_initial: currentProfile.full_name?.split(' ').slice(1).join(' ') ?? '',
          full_name: currentProfile.full_name,
          role: currentProfile.role ?? 'Volunteer',
        });
        setManualMemberId(currentProfile.member_id);
        setActiveStep(2);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [isSignedIn, currentProfile, activeStep, matchedMember]);

  // Step 1: ID Lookup Form
  const {
    register: registerIdLookup,
    handleSubmit: handleIdLookupSubmit,
    formState: { errors: idErrors },
    reset: resetIdForm,
  } = useForm<MemberIdLookupForm>({
    resolver: zodResolver(memberIdLookupSchema),
  });
  const { ref: idRef, ...restIdLookup } = registerIdLookup('memberId');

  // Step 1: Name Lookup Form
  const {
    register: registerNameLookup,
    handleSubmit: handleNameLookupSubmit,
    formState: { errors: nameErrors },
    reset: resetNameForm,
  } = useForm<NameLookupForm>({
    resolver: zodResolver(nameLookupSchema),
  });

  // Step 3: Excuse Form
  const {
    register: registerExcuse,
    handleSubmit: handleExcuseSubmit,
    setValue: setExcuseValue,
    control: excuseControl,
    formState: { errors: excuseErrors },
    reset: resetExcuseForm,
  } = useForm<ExcuseDetailsForm>({
    resolver: zodResolver(excuseDetailsSchema),
    defaultValues: {
      request_date: upcomingSundays[0]?.value ?? '',
      services: ['9AM'],
      reason: '',
    },
  });

  const selectedServices = useWatch({
    control: excuseControl,
    name: 'services',
    defaultValue: ['9AM'],
  });

  const handleToggleService = (serviceValue: string) => {
    const current = selectedServices ?? [];
    if (current.includes(serviceValue)) {
      if (current.length === 1) {
        toast.error('At least one service slot must be selected');
        return;
      }
      setExcuseValue(
        'services',
        current.filter((s) => s !== serviceValue),
        { shouldValidate: true },
      );
    } else {
      setExcuseValue('services', [...current, serviceValue], { shouldValidate: true });
    }
  };

  // Execute lookup by ID
  const onLookupById = async (data: MemberIdLookupForm) => {
    setLookupError(null);
    try {
      const res = await memberLookupMutation.mutateAsync({ memberId: data.memberId });
      if (res.profile) {
        setMatchedMember(res.profile);
        setManualMemberId(data.memberId);
        setActiveStep(2);
      } else {
        setLookupError('No active member found matching this ID. Please check and try again.');
      }
    } catch {
      setLookupError('Unable to verify member ID. Please try again.');
    }
  };

  // Execute lookup by Name
  const onLookupByName = async (data: NameLookupForm) => {
    setLookupError(null);
    try {
      const res = await memberLookupMutation.mutateAsync({ name: data.name });
      if (res.profile) {
        setMatchedMember(res.profile);
        setManualMemberId(data.name);
        setIsNameModalOpen(false);
        resetNameForm();
        setActiveStep(2);
      } else {
        setLookupError(
          `No active member found with the name "${data.name}". Please try another name.`,
        );
      }
    } catch {
      setLookupError('Unable to search by name. Please try again.');
    }
  };

  // Submit excuse
  const onSubmitExcuse = async (data: ExcuseDetailsForm) => {
    try {
      const payload: SubmitServiceExcuseInput = {
        request_date: data.request_date,
        services: data.services,
        reason: data.reason?.trim() ? data.reason.trim() : null,
      };

      if (isSignedIn && currentProfile) {
        payload.user_id = currentProfile.id;
        payload.member_id = currentProfile.member_id;
      } else if (matchedMember?.member_token) {
        payload.member_token = matchedMember.member_token;
        payload.member_id = manualMemberId;
      } else if (matchedMember?.user_id) {
        payload.user_id = matchedMember.user_id;
        payload.member_id = manualMemberId;
      } else if (manualMemberId) {
        payload.member_id = manualMemberId;
      }

      await submitMutation.mutateAsync(payload);
      setSubmittedExcuse(payload);
      toast.success('Excuse request submitted successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit excuse request';
      toast.error(message);
    }
  };

  const handleResetToStepOne = () => {
    setMatchedMember(null);
    setManualMemberId('');
    setLookupError(null);
    setSubmittedExcuse(null);
    resetIdForm();
    resetExcuseForm();
    setActiveStep(1);
  };

  // Display name & avatar helper
  const volunteerName = matchedMember
    ? `${matchedMember.first_name ?? ''} ${matchedMember.last_initial ?? ''}`.trim() ||
      matchedMember.full_name ||
      'Verified Volunteer'
    : 'Volunteer';
  const volunteerMemberId = manualMemberId || currentProfile?.member_id || '';
  const volunteerRole = matchedMember?.role ?? 'Volunteer';

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      {/* Top Banner / Header Card */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-text">
              Volunteer Excuse Request
            </h1>
            <p className="mt-1 text-sm text-muted">
              Submit an advance excuse notification for Sunday service attendance. If you won't be
              able to serve on an upcoming Sunday, let your team know here.
            </p>
          </div>
          <Link
            to={ROUTE_PATHS.home}
            className="inline-flex items-center gap-1.5 self-start rounded-lg px-3 py-1.5 text-xs font-medium text-muted hover:text-text hover:bg-background transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
        </div>
      </div>

      {/* Step Indicator */}
      {!submittedExcuse && (
        <StepIndicator
          currentStep={activeStep}
          totalSteps={3}
          labels={['Scan', 'Confirm', 'Excuse Details']}
          categoryLabel="Excuse request steps"
        />
      )}

      {/* -------------------- STEP 1: SCAN / FIND YOUR PROFILE -------------------- */}
      {activeStep === 1 && !submittedExcuse && (
        <>
          {profileQuery.isLoading ? (
            <SectionCard title="Verifying Volunteer Profile">
              <LoadingState
                layout="horizontal"
                message="Checking your member profile..."
                className="py-4"
              />
            </SectionCard>
          ) : (
            <WizardStep
              title="Step 1: Find Your Profile"
              subtitle="Scan your RFID, enter your Member ID, or search by name to locate your profile."
            >
              <div className="space-y-6">
                {/* ID Lookup Form */}
                <form
                  onSubmit={handleIdLookupSubmit(onLookupById)}
                  noValidate
                  className="space-y-4 rounded-xl border border-border/80 bg-background/50 p-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="memberId" className="text-sm font-medium text-text">
                        Enter Member ID or Scan RFID
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsNameModalOpen(true)}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        <Search className="h-3.5 w-3.5" />
                        Search by name instead
                      </button>
                    </div>
                    <input
                      id="memberId"
                      type="text"
                      autoComplete="off"
                      placeholder="e.g. MEM-2002 or RFID tag"
                      className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-base text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      ref={(e) => {
                        idRef(e);
                        memberIdInputRef.current = e;
                      }}
                      {...restIdLookup}
                      disabled={memberLookupMutation.isPending}
                      autoFocus
                    />
                    {idErrors.memberId && (
                      <p className="text-sm font-medium text-danger">{idErrors.memberId.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="default"
                    size="lg"
                    className="w-full"
                    disabled={memberLookupMutation.isPending}
                  >
                    {memberLookupMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <Spinner size="sm" />
                        Verifying...
                      </span>
                    ) : (
                      'Verify'
                    )}
                  </Button>
                </form>

                {lookupError && (
                  <div className="flex items-start gap-3 rounded-xl border border-danger/20 bg-danger/10 p-4 text-danger">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{lookupError}</p>
                      <p className="text-xs text-danger/80">
                        Please verify your Member ID or reach out to your team leader for
                        assistance.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </WizardStep>
          )}

          {/* Name Lookup Modal */}
          <Dialog isOpen={isNameModalOpen} onClose={() => setIsNameModalOpen(false)} size="md">
            <Dialog.Header>
              <Dialog.Title>Search Profile by Name</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <form onSubmit={handleNameLookupSubmit(onLookupByName)} className="space-y-4">
                <p className="text-sm text-muted">
                  Enter your registered full name to find your volunteer profile.
                </p>
                <div className="space-y-2">
                  <label htmlFor="name-input" className="text-sm font-medium text-text">
                    Registered Name
                  </label>
                  <input
                    id="name-input"
                    type="text"
                    placeholder="e.g. John Doe"
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-base text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    {...registerNameLookup('name')}
                    autoFocus
                  />
                  {nameErrors.name && (
                    <p className="text-sm font-medium text-danger">{nameErrors.name.message}</p>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsNameModalOpen(false)}
                    disabled={memberLookupMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="default" disabled={memberLookupMutation.isPending}>
                    {memberLookupMutation.isPending ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </form>
            </Dialog.Body>
          </Dialog>
        </>
      )}

      {/* -------------------- STEP 2: CONFIRM YOUR DETAILS -------------------- */}
      {activeStep === 2 && matchedMember && !submittedExcuse && (
        <WizardStep
          title="Step 2: Confirm Your Details"
          subtitle="Please confirm your volunteer details before proceeding to specify your absence."
        >
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-border bg-background/60 p-5">
              <Avatar
                name={volunteerName}
                avatarObjectKey={matchedMember.avatar_object_key}
                size="xl"
              />
              <div className="text-center sm:text-left space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h3 className="font-heading text-lg font-bold text-text">{volunteerName}</h3>
                  {isSignedIn ? (
                    <Badge
                      variant="default"
                      className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400"
                    >
                      Signed In
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Verified</Badge>
                  )}
                </div>
                <div className="text-xs text-muted flex flex-wrap gap-x-3 gap-y-1 justify-center sm:justify-start">
                  <span>
                    Member ID:{' '}
                    <strong className="text-text font-semibold">{volunteerMemberId}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Role: <strong className="text-text font-semibold">{volunteerRole}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="button"
                variant="default"
                size="lg"
                className="w-full sm:flex-1"
                onClick={() => setActiveStep(3)}
              >
                Yes, I confirm
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
                onClick={handleResetToStepOne}
              >
                Scan Another Member
              </Button>
            </div>
          </div>
        </WizardStep>
      )}

      {/* -------------------- STEP 3: EXCUSE DETAILS FORM -------------------- */}
      {activeStep === 3 && matchedMember && !submittedExcuse && (
        <WizardStep
          title="Step 3: Excuse Details"
          subtitle="Select the Sunday date and specific service slot(s) you need to be excused from."
        >
          <form onSubmit={handleExcuseSubmit(onSubmitExcuse)} noValidate className="space-y-6">
            {/* Volunteer identity pill */}
            <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/50 px-4 py-2.5 text-xs text-muted">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-500" />
                <span>
                  Excusing: <strong className="text-text">{volunteerName}</strong> (
                  {volunteerMemberId})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className="text-primary hover:underline text-xs font-medium"
              >
                Change
              </button>
            </div>

            {/* Sunday Service Date */}
            <div className="space-y-2">
              <label
                htmlFor="request_date"
                className="text-sm font-medium text-text flex items-center gap-1.5"
              >
                <Calendar className="h-4 w-4 text-primary" />
                <span>Sunday Service Date</span>
              </label>
              <select
                id="request_date"
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-base text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...registerExcuse('request_date')}
              >
                {upcomingSundays.map((sunday) => (
                  <option key={sunday.value} value={sunday.value}>
                    {sunday.label}
                  </option>
                ))}
              </select>
              {excuseErrors.request_date && (
                <p className="text-sm font-medium text-danger">
                  {excuseErrors.request_date.message}
                </p>
              )}
            </div>

            {/* Service Slots Multi-Select Checkboxes */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Service Slot(s)</span>
                </label>
                <span className="text-xs text-muted">Select all that apply</span>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {EXCUSE_SERVICE_SLOTS.map((slot) => {
                  const isChecked = selectedServices.includes(slot.value);
                  return (
                    <button
                      key={slot.value}
                      type="button"
                      role="checkbox"
                      aria-checked={isChecked}
                      onClick={() => handleToggleService(slot.value)}
                      className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition ${
                        isChecked
                          ? 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary'
                          : 'border-border bg-background text-text hover:border-muted'
                      }`}
                    >
                      <span className="text-sm">{slot.label}</span>
                      <div
                        className={`h-5 w-5 rounded-md border flex items-center justify-center transition ${
                          isChecked
                            ? 'border-primary bg-primary text-white'
                            : 'border-border bg-surface'
                        }`}
                      >
                        {isChecked && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {excuseErrors.services && (
                <p className="text-sm font-medium text-danger">{excuseErrors.services.message}</p>
              )}
            </div>

            {/* Optional Reason / Notes */}
            <div className="space-y-2">
              <label htmlFor="reason" className="text-sm font-medium text-text">
                Reason / Notes <span className="text-xs text-muted font-normal">(Optional)</span>
              </label>
              <textarea
                id="reason"
                rows={3}
                placeholder="e.g., Out of town, family event, medical reason..."
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...registerExcuse('reason')}
              />
              {excuseErrors.reason && (
                <p className="text-sm font-medium text-danger">{excuseErrors.reason.message}</p>
              )}
            </div>

            {/* Submit & Back buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="submit"
                variant="default"
                size="lg"
                className="w-full sm:flex-1"
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Spinner size="sm" />
                    Submitting Excuse...
                  </span>
                ) : (
                  'Submit Excuse Request'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setActiveStep(2)}
                disabled={submitMutation.isPending}
                className="w-full sm:w-auto"
              >
                Back to Step 2
              </Button>
            </div>
          </form>
        </WizardStep>
      )}

      {/* -------------------- SUBMITTED CONFIRMATION SCREEN -------------------- */}
      {submittedExcuse && (
        <div className="rounded-2xl border border-emerald-500/30 bg-surface p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div className="space-y-1">
              <h2 className="font-heading text-2xl font-bold text-text">
                Excuse Request Submitted
              </h2>
              <p className="text-sm text-muted max-w-md mx-auto">
                Thank you for letting your team leaders and coordinators know in advance. Your
                schedule has been updated.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/70 p-5 space-y-3 text-sm">
            <div className="flex justify-between border-b border-border/60 pb-2">
              <span className="text-muted">Volunteer:</span>
              <span className="font-semibold text-text">
                {volunteerName} ({volunteerMemberId})
              </span>
            </div>
            <div className="flex justify-between border-b border-border/60 pb-2">
              <span className="text-muted">Sunday Date:</span>
              <span className="font-semibold text-text">
                {new Date(`${submittedExcuse.request_date}T00:00:00`).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex justify-between border-b border-border/60 pb-2">
              <span className="text-muted">Excused Services:</span>
              <span className="font-semibold text-text">
                {formatServiceSlots(submittedExcuse.services)}
              </span>
            </div>
            {submittedExcuse.reason && (
              <div className="flex justify-between pt-1">
                <span className="text-muted">Reason:</span>
                <span className="font-medium text-text italic">"{submittedExcuse.reason}"</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              type="button"
              variant="default"
              size="lg"
              className="w-full sm:flex-1"
              onClick={handleResetToStepOne}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Submit Another Excuse
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => navigate(ROUTE_PATHS.home)}
            >
              Go Home
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
