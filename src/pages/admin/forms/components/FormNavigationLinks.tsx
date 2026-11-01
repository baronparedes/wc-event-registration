import { AdminSubNavLink } from '@/components/layout';
import { toRoute } from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { useIsMobileViewport } from '@/hooks/utils';

type FormNavigationSection = 'form' | 'fields' | 'submissions';

type FormNavigationLinksProps = {
  formId: string;
  currentSection: FormNavigationSection;
};

export function FormNavigationLinks({ formId }: FormNavigationLinksProps) {
  const { can } = useAdminAuthQuery();
  const canWrite = can('canWriteAdminData');
  const canRead = can('canReadAdminData');
  const isMobile = useIsMobileViewport();

  if (isMobile) return null;

  return (
    <>
      {canWrite && (
        <AdminSubNavLink to={toRoute('adminFormDetail', { id: formId })}>Form</AdminSubNavLink>
      )}
      {canWrite && (
        <AdminSubNavLink to={toRoute('adminFormFields', { id: formId })}>Fields</AdminSubNavLink>
      )}
      {canRead && (
        <AdminSubNavLink to={toRoute('adminFormSubmissions', { id: formId })}>
          Submissions
        </AdminSubNavLink>
      )}
    </>
  );
}
