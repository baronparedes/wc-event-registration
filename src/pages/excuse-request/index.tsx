import { useState } from 'react';

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
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { Avatar, Badge, Button, Spinner } from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import {
  type MemberLookupProfile,
  useCurrentProfileQuery,
  useMemberLookupQuery,
} from '@/hooks/domain/members';
import { useSubmitExcuseMutation } from '@/hooks/domain/services';
import { type SubmitServiceExcuseInput } from '@/lib/domain/services';

const excuseFormSchema = z.object({
  request_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Request date must be in YYYY-MM-DD format'),
  services: z.array(z.string().trim().min(1)).min(1, 'At least one service slot is required'),
  reason: z.string().trim().max(500, 'Reason must be 500 characters or less').optional().nullable(),
});

type ExcuseFormValues = z.infer<typeof excuseFormSchema>;

const SERVICE_SLOT_OPTIONS = [
  { label: 'All Services', value: 'All Services' },
  { label: '9:00 AM', value: '9AM' },
  { label: '12:00 NN', value: '12NN' },
  { label: '3:00 PM', value: '3PM' },
];

function getNearestUpcomingSundayString(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (7 - day) % 7;
  const sunday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (diff === 0 ? 0 : diff));
  const year = sunday.getFullYear();
  const month = String(sunday.getMonth() + 1).padStart(2, '0');
  const date = String(sunday.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

function isSundayDate(dateString: string): boolean {
  if (!dateString) return false;
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getDay() === 0;
}

export function ExcuseRequestPage() {
  const authQuery = useAdminAuthQuery();
  const profileQuery = useCurrentProfileQuery();
  const memberLookupMutation = useMemberLookupQuery();
  const submitMutation = useSubmitExcuseMutation();

  const [lookupMemberIdInput, setLookupMemberIdInput] = useState('');
  const [matchedMember, setMatchedMember] = useState<MemberLookupProfile | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [submittedExcuse, setSubmittedExcuse] = useState<SubmitServiceExcuseInput | null>(null);

  const isSignedIn = Boolean(authQuery.data?.session && profileQuery.data);
  const currentProfile = profileQuery.data;

  // Active verified volunteer info
  const activeVolunteerName = isSignedIn
    ? currentProfile?.full_name || 'Signed-In Volunteer'
    : matchedMember
      ? `${matchedMember.first_name ?? ''} ${matchedMember.last_initial ?? ''}`.trim() ||
        matchedMember.full_name ||
        'Verified Volunteer'
      : null;

  const activeMemberId = isSignedIn
    ? currentProfile?.member_id
    : matchedMember?.user_id
      ? lookupMemberIdInput.trim()
      : lookupMemberIdInput.trim();

  const activeRole = isSignedIn ? currentProfile?.role : matchedMember?.role;

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<ExcuseFormValues>({
    resolver: zodResolver(excuseFormSchema),
    defaultValues: {
      request_date: getNearestUpcomingSundayString(),
      services: ['All Services'],
      reason: '',
    },
  });

  const selectedServices = useWatch({ control, name: 'services' }) || [];
  const selectedDate = useWatch({ control, name: 'request_date' }) || '';

  const handleLookupMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = lookupMemberIdInput.trim();
    if (!query) {
      setLookupError('Please enter a Member ID');
      return;
    }

    setLookupError(null);
    try {
      const result = await memberLookupMutation.mutateAsync({ memberId: query });
      if (result.profile) {
        setMatchedMember(result.profile);
      } else {
        setLookupError('No active member found matching this ID. Please check and try again.');
      }
    } catch {
      setLookupError('Failed to verify member ID. Please try again.');
    }
  };

  const handleResetLookup = () => {
    setMatchedMember(null);
    setLookupMemberIdInput('');
    setLookupError(null);
    reset({
      request_date: getNearestUpcomingSundayString(),
      services: ['All Services'],
      reason: '',
    });
  };

  const handleServiceSlotToggle = (val: string) => {
    if (val === 'All Services') {
      setValue('services', ['All Services'], { shouldValidate: true });
      return;
    }

    const withoutAll = selectedServices.filter((s) => s !== 'All Services');
    const isSelected = withoutAll.includes(val);

    const nextServices = isSelected ? withoutAll.filter((s) => s !== val) : [...withoutAll, val];

    if (nextServices.length === 0) {
      setValue('services', ['All Services'], { shouldValidate: true });
    } else {
      setValue('services', nextServices, { shouldValidate: true });
    }
  };

  const onSubmit = async (data: ExcuseFormValues) => {
    try {
      const payload: SubmitServiceExcuseInput = {
        request_date: data.request_date,
        services: data.services,
        reason: data.reason?.trim() || null,
      };

      if (isSignedIn && currentProfile) {
        payload.user_id = currentProfile.id;
        payload.member_id = currentProfile.member_id;
      } else if (matchedMember?.member_token) {
        payload.member_token = matchedMember.member_token;
        payload.member_id = lookupMemberIdInput.trim();
      } else {
        payload.member_id = lookupMemberIdInput.trim();
      }

      await submitMutation.mutateAsync(payload);
      setSubmittedExcuse(payload);
      toast.success('Excuse request submitted successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit excuse request';
      toast.error(message);
    }
  };

  const handleResetForm = () => {
    setSubmittedExcuse(null);
    reset({
      request_date: getNearestUpcomingSundayString(),
      services: ['All Services'],
      reason: '',
    });
    if (!isSignedIn) {
      handleResetLookup();
    }
  };

  const isVerified = isSignedIn || Boolean(matchedMember);

  return (
    <div className="min-h-[80vh] py-8 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="space-y-3">
          <Link
            to={ROUTE_PATHS.home}
            className="inline-flex items-center text-sm font-medium text-text-muted hover:text-text transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Home
          </Link>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold text-text">
                Volunteer Excuse Request
              </h1>
              <p className="text-sm text-text-muted">
                Unable to attend your scheduled Sunday service commitment? Let your team lead know
                in advance.
              </p>
            </div>
          </div>
        </div>

        {/* Success Confirmation Card */}
        {submittedExcuse ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 space-y-5 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-heading font-semibold text-text">
                  Excuse Request Submitted
                </h2>
                <p className="text-sm text-text-muted">
                  Your excuse request has been officially recorded. Your ministry leaders have been
                  notified and your commitment schedule updated.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-3 text-sm">
              <div className="flex justify-between items-center pb-2 border-b border-border/50">
                <span className="text-text-muted">Volunteer:</span>
                <span className="font-medium text-text">{activeVolunteerName}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border/50">
                <span className="text-text-muted">Service Date:</span>
                <span className="font-medium text-text">{submittedExcuse.request_date}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border/50">
                <span className="text-text-muted">Excused Services:</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {submittedExcuse.services.map((svc) => (
                    <Badge key={svc} variant="outline">
                      {svc}
                    </Badge>
                  ))}
                </div>
              </div>
              {Boolean(submittedExcuse.reason) && (
                <div className="flex justify-between items-start pt-1">
                  <span className="text-text-muted shrink-0 mr-4">Reason:</span>
                  <span className="text-text text-right font-medium italic">
                    "{submittedExcuse.reason}"
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="default" onClick={handleResetForm} className="w-full sm:w-auto">
                Submit Another Request
              </Button>
              <Button variant="outline" asChild className="w-full sm:w-auto">
                <Link to={ROUTE_PATHS.home}>Return to Home</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Step 1: Volunteer Identification Card */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    1
                  </span>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                    Volunteer Identification
                  </h2>
                </div>
                {isVerified && (
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                  >
                    <UserCheck className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>

              {isSignedIn ? (
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-primary/20 bg-primary/5">
                  <div className="flex items-center space-x-3">
                    <Avatar
                      name={currentProfile?.full_name || 'Volunteer'}
                      avatarObjectKey={currentProfile?.avatar_object_key}
                      size="sm"
                      className="border border-primary/30"
                    />
                    <div>
                      <p className="text-sm font-semibold text-text">{currentProfile?.full_name}</p>
                      <p className="text-xs text-text-muted">
                        Member ID:{' '}
                        <span className="font-mono text-text">{currentProfile?.member_id}</span>
                        {currentProfile?.role ? ` • ${currentProfile.role}` : ''}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">Signed In</Badge>
                </div>
              ) : matchedMember ? (
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                  <div className="flex items-center space-x-3">
                    <Avatar
                      name={activeVolunteerName || 'Volunteer'}
                      avatarObjectKey={matchedMember.avatar_object_key}
                      size="sm"
                      className="border border-emerald-500/30"
                    />
                    <div>
                      <p className="text-sm font-semibold text-text">{activeVolunteerName}</p>
                      <p className="text-xs text-text-muted">
                        Member ID: <span className="font-mono text-text">{activeMemberId}</span>
                        {activeRole ? ` • ${activeRole}` : ''}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetLookup}
                    className="text-xs text-text-muted hover:text-text"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Change
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleLookupMember} className="space-y-3">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="memberIdLookupInput"
                      className="text-xs font-medium text-text-muted"
                    >
                      Enter Member ID or Scan RFID
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                      <input
                        id="memberIdLookupInput"
                        type="text"
                        value={lookupMemberIdInput}
                        onChange={(e) => setLookupMemberIdInput(e.target.value)}
                        placeholder="e.g. MEM-1001 or scan card..."
                        className="w-full rounded-xl border border-border bg-background pl-9 pr-24 py-2.5 text-sm text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                        disabled={memberLookupMutation.isPending}
                        autoFocus
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={memberLookupMutation.isPending || !lookupMemberIdInput.trim()}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8"
                      >
                        {memberLookupMutation.isPending ? (
                          <Spinner className="h-3.5 w-3.5" />
                        ) : (
                          'Verify'
                        )}
                      </Button>
                    </div>
                  </div>

                  {lookupError ? (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{lookupError}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted">
                      Your Member ID is required to associate this excuse request with your Sunday
                      volunteer schedule.
                    </p>
                  )}
                </form>
              )}
            </div>

            {/* Step 2: Excuse Details Form */}
            {isVerified && (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="rounded-2xl border border-border bg-card p-5 space-y-5 shadow-sm"
              >
                <div className="flex items-center space-x-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    2
                  </span>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                    Excuse Details
                  </h2>
                </div>

                {/* Service Date Picker */}
                <div className="space-y-1.5">
                  <label htmlFor="request_date" className="text-xs font-medium text-text">
                    Sunday Service Date <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="request_date"
                    type="date"
                    {...register('request_date')}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                  />
                  {errors.request_date ? (
                    <p className="text-xs text-destructive">{errors.request_date.message}</p>
                  ) : selectedDate && !isSundayDate(selectedDate) ? (
                    <p className="text-xs text-amber-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Notice: Selected date is not a Sunday. Most service commitments occur on
                      Sundays.
                    </p>
                  ) : (
                    <p className="text-xs text-text-muted flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Select the Sunday you will be unable to serve.
                    </p>
                  )}
                </div>

                {/* Services Multi-Select */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-text">
                    Services to Excuse <span className="text-destructive">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {SERVICE_SLOT_OPTIONS.map((slot) => {
                      const isSelected = selectedServices.includes(slot.value);
                      return (
                        <button
                          key={slot.value}
                          type="button"
                          onClick={() => handleServiceSlotToggle(slot.value)}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-background text-text-muted hover:border-primary/40 hover:text-text'
                          }`}
                        >
                          <span>{slot.label}</span>
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                  {errors.services && (
                    <p className="text-xs text-destructive">{errors.services.message}</p>
                  )}
                </div>

                {/* Reason (Optional) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label htmlFor="reason" className="text-xs font-medium text-text">
                      Reason / Notes (Optional)
                    </label>
                    <span className="text-[10px] text-text-muted">Max 500 characters</span>
                  </div>
                  <textarea
                    id="reason"
                    rows={3}
                    placeholder="e.g. Traveling out of town, family emergency, feeling unwell..."
                    {...register('reason')}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition resize-none"
                  />
                  {errors.reason && (
                    <p className="text-xs text-destructive">{errors.reason.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="default"
                    disabled={submitMutation.isPending}
                    className="w-full h-10 font-semibold"
                  >
                    {submitMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <Spinner className="h-4 w-4" />
                        Submitting Excuse Request...
                      </span>
                    ) : (
                      'Submit Excuse Request'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
