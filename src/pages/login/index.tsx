import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { FormInputField } from '@/components/ui/FormInputField';
import { ROUTE_PATHS, TOAST_MESSAGES } from '@/config/constants';
import {
  useAdminAuthQuery,
  useAdminLoginMutation,
  useGoogleLoginMutation,
  useYahooLoginMutation,
} from '@/hooks/domain/auth';

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

  if (redirectTarget.startsWith(ROUTE_PATHS.login)) {
    return ROUTE_PATHS.adminEvents;
  }

  return redirectTarget;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginMutation = useAdminLoginMutation();
  const googleLoginMutation = useGoogleLoginMutation();
  const yahooLoginMutation = useYahooLoginMutation();
  const { data: adminAuth, isLoading } = useAdminAuthQuery();
  const redirectTarget = getSafeRedirectTarget(location.search);
  const [showEmailLogin, setShowEmailLogin] = useState(false);

  const form = useForm<AdminLoginForm>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (adminAuth?.isAuthenticated) {
      navigate(redirectTarget, { replace: true });
      return;
    }

    if (adminAuth?.session && !adminAuth.isAuthenticated) {
      const target = redirectTarget.startsWith('/admin') ? ROUTE_PATHS.home : redirectTarget;
      navigate(target, { replace: true });
    }
  }, [adminAuth, isLoading, navigate, redirectTarget]);

  async function handleGoogleSignIn() {
    try {
      const fullRedirectPath = `${ROUTE_PATHS.login}?redirect=${encodeURIComponent(redirectTarget)}`;
      await googleLoginMutation.mutateAsync({ redirectTo: fullRedirectPath });
    } catch (error) {
      const message = error instanceof Error ? error.message : TOAST_MESSAGES.adminSignInFailure;
      toast.error(message);
    }
  }

  async function handleYahooSignIn() {
    try {
      const fullRedirectPath = `${ROUTE_PATHS.login}?redirect=${encodeURIComponent(redirectTarget)}`;
      await yahooLoginMutation.mutateAsync({ redirectTo: fullRedirectPath });
    } catch (error) {
      const message = error instanceof Error ? error.message : TOAST_MESSAGES.adminSignInFailure;
      toast.error(message);
    }
  }

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
      <h1 className="font-heading text-2xl font-semibold text-text">Login</h1>
      <p className="mt-2 text-sm text-muted">Sign in with your Google or Yahoo account.</p>

      <div className="mt-6 space-y-4">
        <Button
          disabled={googleLoginMutation.isPending || yahooLoginMutation.isPending}
          fullWidth
          size="md"
          variant="outline"
          type="button"
          onClick={handleGoogleSignIn}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              fill="#EA4335"
            />
          </svg>
          {googleLoginMutation.isPending ? 'Redirecting...' : 'Sign in with Google'}
        </Button>

        <Button
          disabled={googleLoginMutation.isPending || yahooLoginMutation.isPending}
          fullWidth
          size="md"
          variant="outline"
          type="button"
          onClick={handleYahooSignIn}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M22.776 5.419c-.067-.066-.195-.121-.351-.121h-2.909c-.218 0-.424.086-.549.255L14.712 11.7l-3.327-5.992c-.105-.181-.295-.288-.501-.288H7.994c-.183 0-.306.071-.359.16-.051.089-.033.228.053.374l5.337 9.088v6.622c0 .245.195.441.444.441h2.518c.247 0 .444-.196.444-.441v-6.69l6.302-9.155c.074-.107.106-.239.043-.397z"
              fill="#400090"
            />
          </svg>
          {yahooLoginMutation.isPending ? 'Redirecting...' : 'Sign in with Yahoo'}
        </Button>
      </div>

      {!showEmailLogin && (
        <div className="mt-6 text-center">
          <Button
            variant="link"
            size="sm"
            onClick={() => setShowEmailLogin(true)}
            className="text-muted hover:text-text"
          >
            Sign in with email/password
          </Button>
        </div>
      )}

      {showEmailLogin && (
        <>
          <div className="relative my-6 text-center text-xs text-muted border-t border-border pt-2">
            <span className="bg-surface text-muted uppercase tracking-wider text-[11px] font-medium font-mono px-2">
              Or
            </span>
          </div>

          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
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
        </>
      )}
    </section>
  );
}
