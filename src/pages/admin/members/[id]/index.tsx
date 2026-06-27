import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ROUTE_PATHS, TOAST_MESSAGES, UI_MESSAGES } from '@/config/constants'
import { Button } from '@/components/ui/Button'
import { FormInputField } from '@/components/ui/FormInputField'
import { SectionCard } from '@/components/ui/SectionCard'
import type { AdminMember, UpdateMemberInput } from '@/lib/domain/members'
import { updateMemberSchema } from '@/lib/domain/members'
import { useAdminMemberQuery, useUpdateMemberMutation } from '@/hooks/domain/members'

const DEFAULT_VALUES: UpdateMemberInput = {
  full_name: '',
  first_name: '',
  last_name: '',
  nickname: '',
  email: '',
  phone: '',
  date_of_birth: '',
  role: '',
  category: '',
}

function toFormValues(member: AdminMember): UpdateMemberInput {
  return {
    full_name: member.full_name,
    first_name: member.first_name ?? '',
    last_name: member.last_name ?? '',
    nickname: member.nickname ?? '',
    email: member.email ?? '',
    phone: member.phone ?? '',
    date_of_birth: member.date_of_birth ?? '',
    role: member.role,
    category: member.category,
  }
}

export function AdminMemberDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const memberQuery = useAdminMemberQuery(id)
  const updateMemberMutation = useUpdateMemberMutation()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateMemberInput>({
    resolver: zodResolver(updateMemberSchema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (memberQuery.data) {
      reset(toFormValues(memberQuery.data))
    }
  }, [memberQuery.data, reset])

  async function onSubmit(values: UpdateMemberInput) {
    if (!id) return

    try {
      await updateMemberMutation.mutateAsync({ id, ...values })
      toast.success(TOAST_MESSAGES.member.updated)
      navigate(ROUTE_PATHS.adminMembers)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : TOAST_MESSAGES.member.updateFailed)
    }
  }

  if (!id) {
    return <p className="text-sm text-red-600">Member ID is missing.</p>
  }

  if (memberQuery.isLoading) {
    return <p className="text-sm text-muted">{UI_MESSAGES.loading.member}</p>
  }

  if (memberQuery.isError || !memberQuery.data) {
    return <p className="text-sm text-red-600">{UI_MESSAGES.errors.memberNotFound}</p>
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-text">Edit Member</h1>
          <p className="mt-1 text-sm text-muted">
            Update the member profile, contact details, and admin metadata.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(ROUTE_PATHS.adminMembers)}>
          Back to Members
        </Button>
      </div>

      <SectionCard
        title="Member Profile"
        subtitle="Member ID stays read-only because it is used for lookup and registration linking."
      >
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <FormInputField
              id="member-id"
              label="Member ID"
              value={memberQuery.data.member_id}
              onChange={() => undefined}
              readOnly
              disabled
            />
            <FormInputField
              id="full-name"
              label="Full Name"
              registration={register('full_name')}
              error={errors.full_name?.message}
              required
            />
            <FormInputField
              id="first-name"
              label="First Name"
              registration={register('first_name')}
              error={errors.first_name?.message}
            />
            <FormInputField
              id="last-name"
              label="Last Name"
              registration={register('last_name')}
              error={errors.last_name?.message}
            />
            <FormInputField
              id="nickname"
              label="Nickname"
              registration={register('nickname')}
              error={errors.nickname?.message}
            />
            <FormInputField
              id="date-of-birth"
              label="Date of Birth"
              registration={register('date_of_birth')}
              error={errors.date_of_birth?.message}
              type="date"
            />
            <FormInputField
              id="email"
              label="Email"
              registration={register('email')}
              error={errors.email?.message}
              type="email"
            />
            <FormInputField
              id="phone"
              label="Phone"
              registration={register('phone')}
              error={errors.phone?.message}
            />
            <FormInputField
              id="role"
              label="Role"
              registration={register('role')}
              error={errors.role?.message}
            />
            <FormInputField
              id="category"
              label="Category"
              registration={register('category')}
              error={errors.category?.message}
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(ROUTE_PATHS.adminMembers)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isDirty || updateMemberMutation.isPending}>
              {updateMemberMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </SectionCard>
    </section>
  )
}
