import { useState } from 'react';

import { Link, useParams } from 'react-router-dom';

import { EntityBlueprintAiModal } from '@/components/domain/ai-generator';
import { AdminPageShell } from '@/components/layout';
import { AiBrandIcon, AlertBanner, Button } from '@/components/ui';
import { ROUTE_PATHS, toRoute } from '@/config/constants';
import { useAdminEventFieldsQuery } from '@/hooks/domain/event-fields';
import { useAdminEventQuery } from '@/hooks/domain/events';
import type { AdminEventField } from '@/lib/domain/event-fields';
import { EventNavigationLinks } from '@/pages/admin/events/components';

import { EventFieldEditPanel, EventFieldsList } from './components';

type PanelState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; field: AdminEventField };

export function AdminEventFieldsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: event, isLoading: eventLoading } = useAdminEventQuery(id);
  const { data: fields, isLoading: fieldsLoading } = useAdminEventFieldsQuery(id);
  const [panelState, setPanelState] = useState<PanelState>({ mode: 'closed' });
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const isLoading = eventLoading || fieldsLoading;
  const isDraft = event?.status === 'draft';
  const isPublished = event?.status === 'published';
  const panelField: AdminEventField | null = panelState.mode === 'edit' ? panelState.field : null;

  function openCreate() {
    setPanelState({ mode: 'create' });
  }

  function openEdit(field: AdminEventField) {
    setPanelState({ mode: 'edit', field });
  }

  function closePanel() {
    setPanelState({ mode: 'closed' });
  }

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[
          { label: 'Events', to: ROUTE_PATHS.adminEvents },
          {
            label: event?.title ?? 'Event',
            to: id ? toRoute('adminEventDetail', { id }) : undefined,
          },
          { label: 'Registration Fields' },
        ]}
        navLinks={id ? <EventNavigationLinks eventId={id} currentSection="fields" /> : undefined}
        title="Manage Registration Fields"
        description={
          event
            ? `Manage the registration form fields for ${event.title}`
            : 'Manage registration form fields'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAiModalOpen(true)}
              disabled={!isDraft}
              title={!isDraft ? 'Only draft events can add new fields.' : undefined}
            >
              <AiBrandIcon className="mr-1.5 h-4 w-4 text-primary" />
              Add Questions with AI
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={openCreate}
              disabled={!isDraft}
              title={!isDraft ? 'Only draft events can add new fields.' : undefined}
            >
              Add Field
            </Button>
          </div>
        }
      />

      {!isDraft && (
        <AlertBanner
          variant="info"
          title={isPublished ? 'Published event' : 'Archived event'}
          description={
            isPublished
              ? 'You can edit labels, registrant type, placeholder/help text, and option capacity. To change field types, options, or other validation rules, archive this event and create a new one.'
              : 'Field edits are disabled on archived events.'
          }
        />
      )}

      <AdminPageShell.Content isLoading={isLoading} loadingMessage="Loading fields...">
        {!event ? (
          <AlertBanner
            variant="error"
            description={
              <>
                Event not found.{' '}
                <Link className="underline" to={ROUTE_PATHS.adminEvents}>
                  Back to events
                </Link>
              </>
            }
          />
        ) : (
          <>
            <EventFieldsList
              fields={fields ?? []}
              eventId={id ?? ''}
              eventStatus={event.status}
              onEdit={openEdit}
            />

            {panelState.mode !== 'closed' && id && (
              <EventFieldEditPanel
                eventId={id}
                eventStatus={event.status}
                field={panelField}
                onClose={closePanel}
              />
            )}

            {isAiModalOpen && id && (
              <EntityBlueprintAiModal
                isOpen={isAiModalOpen}
                onClose={() => setIsAiModalOpen(false)}
                domain="event"
                mode="append_fields"
                existingEntityId={id}
              />
            )}
          </>
        )}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
