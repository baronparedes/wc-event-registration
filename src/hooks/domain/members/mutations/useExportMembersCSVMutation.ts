import { useMutation } from '@tanstack/react-query';

import {
  type MemberAttributeFilter,
  type MemberUserListRow,
  fetchAdminMembersPage,
} from '@/lib/domain/members';

interface ExportMembersCSVParams {
  search_term: string;
  status_filter: 'active' | 'deleted' | 'all';
  attribute_filter?: MemberAttributeFilter;
}

const EXPORT_PAGE_SIZE = 500;

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function readOptionalText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function buildUtcTimestampForFilename(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

async function buildMembersCsv(params: ExportMembersCSVParams) {
  const searchTerm = params.search_term.trim();
  const searchTokens = searchTerm.split(/\s+/).filter((token) => token.length > 0);
  const members: MemberUserListRow[] = [];
  let offset = 0;

  while (true) {
    const { rows, count } = await fetchAdminMembersPage({
      offset,
      pageSize: EXPORT_PAGE_SIZE,
      searchTerm,
      searchTokens,
      statusFilter: params.status_filter,
      attributeFilter: params.attribute_filter,
    });

    members.push(...rows);
    offset += rows.length;

    if (rows.length < EXPORT_PAGE_SIZE || (count !== null && offset >= count)) {
      break;
    }
  }

  const header = [
    'member_id',
    'first_name',
    'last_name',
    'nickname',
    'email',
    'phone',
    'date_of_birth',
    'role',
    'category',
    'last_activity',
  ];
  const csvRows = members.map((member) => [
    member.member_id,
    member.first_name,
    member.last_name,
    member.nickname,
    member.email,
    member.phone,
    member.date_of_birth,
    readOptionalText(member.role),
    readOptionalText(member.category),
    member.last_activity,
  ]);
  const text = [header, ...csvRows]
    .map((row) => row.map((value) => escapeCsvField(value)).join(','))
    .join('\n');
  const timestamp = buildUtcTimestampForFilename(new Date());

  return {
    text,
    filename: `members-${params.status_filter}-${timestamp}.csv`,
  };
}

/** Exports all members matching the Manage Members filters. */
export function useExportMembersCSVMutation(params: ExportMembersCSVParams) {
  return useMutation({
    mutationFn: () => buildMembersCsv(params),
  });
}
