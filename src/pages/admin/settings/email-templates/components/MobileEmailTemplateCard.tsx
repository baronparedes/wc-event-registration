import { Edit2 } from 'lucide-react';

import {
  Badge,
  MobileCard,
  MobileCardActionButton,
  MobileCardActions,
  MobileCardBody,
  MobileCardContent,
  MobileCardContentItem,
  MobileCardDivider,
  MobileCardHeader,
} from '@/components/ui';
import type { EmailTemplate } from '@/lib/domain/email-templates';

type MobileEmailTemplateCardProps = {
  template: EmailTemplate;
  onEdit: (template: EmailTemplate) => void;
};

export function MobileEmailTemplateCard({ template, onEdit }: MobileEmailTemplateCardProps) {
  return (
    <MobileCard>
      <MobileCardBody>
        <MobileCardHeader>
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-base font-semibold leading-snug text-text">
              {template.name}
            </h2>
            <p className="mt-1 font-mono text-xs text-muted break-all">{template.slug}</p>
          </div>
        </MobileCardHeader>

        <MobileCardDivider />

        <MobileCardContent>
          <MobileCardContentItem
            label="Resend Template ID"
            value={template.resend_template_id}
            valueClassName="mt-0.5 font-mono text-xs text-text break-all"
          />
          <MobileCardContentItem label="Required Variables" colSpan={2}>
            {!template.required_variables || template.required_variables.length === 0 ? (
              <span className="text-xs text-muted">None</span>
            ) : (
              <div className="flex flex-wrap gap-1 mt-1">
                {template.required_variables.map((v) => (
                  <Badge key={v} variant="outline" className="text-[11px] py-0.5 px-2">
                    {v}
                  </Badge>
                ))}
              </div>
            )}
          </MobileCardContentItem>
        </MobileCardContent>
      </MobileCardBody>

      <MobileCardActions>
        <MobileCardActionButton onClick={() => onEdit(template)}>
          <Edit2 className="h-4 w-4" />
          Edit
        </MobileCardActionButton>
      </MobileCardActions>
    </MobileCard>
  );
}
