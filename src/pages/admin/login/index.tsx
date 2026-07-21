import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { FormInputField } from '@/components/ui/FormInputField';
import { ROUTE_PATHS, TOAST_MESSAGES } from '@/config/constants';
import { useAdminAuthQuery, useAdminLoginMutation } from '@/hooks/domain/auth';

const adminLoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type AdminLoginForm = z.infer<typeof adminLoginSchema>;

function getSafeRedirectTarget(search: string): string {
  const params = new URLSearchParams(search);
  const redirectTarget = params.get('redirect');

  if (!redirectTarget || !redirectTarget.startsWith('/') || redirectTarget.startsWith('//')) {
    return ROUTE_PATHS.adminEvents;
  }

  if (redirectTarget.startsWith(ROUTE_PATHS.adminLogin)) {
    return ROUTE_PATHS.adminEvents;
  }

  return redirectTarget;
}

export function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginMutation = useAdminLoginMutation();
  const { data: adminAuth, isLoading } = useAdminAuthQuery();
  const redirectTarget = getSafeRedirectTarget(location.search);

  const form = useForm<AdminLoginForm>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (!isLoading && adminAuth?.isAuthenticated) {
      navigate(redirectTarget, { replace: true });
    }
  }, [adminAuth?.isAuthenticated, isLoading, navigate, redirectTarget]);

  async function handleSubmit(values: AdminLoginForm) {
    try {
      await loginMutation.mutateAsync(values);
      toast.success(TOAST_MESSAGES.adminSignInSuccess);
      navigate(redirectTarget, { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : TOAST_MESSAGES.adminSignInFailure;
      toast.error(message);
    }
  }

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <h1 className="font-heading text-2xl font-semibold text-text">Admin Login</h1>
      <p className="mt-2 text-sm text-muted">Sign in with your admin credentials.</p>

      <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
        <FormInputField
          autoComplete="email"
          id="admin-email"
          label="Email Address"
          placeholder="admin@example.com"
          required
          type="email"
          registration={form.register('email')}
          error={form.formState.errors.email?.message}
        />

        <FormInputField
          autoComplete="current-password"
          id="admin-password"
          label="Password"
          placeholder="Enter your password"
          required
          type="password"
          registration={form.register('password')}
          error={form.formState.errors.password?.message}
        />

        <Button disabled={loginMutation.isPending} fullWidth size="md" type="submit">
          {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
    </section>
  );
}
