import { useState } from 'react';

import { Check, ChevronDown, ChevronUp, Copy, FileSpreadsheet, Info } from 'lucide-react';

const SAMPLE_CSV = `member_id,first_name,last_name,nickname,role,category,email,phone,date_of_birth,first_sunday,second_sunday,third_sunday,fourth_sunday,fifth_sunday
RFID-001,John,Doe,JD,Member,Adults,john.doe@example.com,09171234567,1990-05-15,,,,,
RFID-002,Jane,Smith,Janey,Prayer Coach,Adults,jane.smith@example.com,09181234567,1995-10-20,9AM,9AM,9AM,9AM,`;

export function CsvFormatGuideCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  async function handleCopyTemplate() {
    try {
      await navigator.clipboard.writeText(SAMPLE_CSV);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is blocked
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface text-text shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-background/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">CSV Format Guide & Guidelines</h3>
            <p className="text-xs text-muted">
              Review required columns, aliases, and matching rules before uploading.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-muted">
          <span>{isOpen ? 'Hide Guide' : 'Show Guide'}</span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-border px-4 py-4 space-y-4 text-xs">
          {/* Required Fields */}
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-text">
              <span className="flex h-2 w-2 rounded-full bg-danger" />
              <span>Mandatory Columns (Required on every row)</span>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border border-border bg-background p-2.5">
                <span className="font-mono font-medium text-text">member_id</span>
                <p className="mt-0.5 text-muted">RFID / Barcode identifier (e.g. RFID-001)</p>
                <span className="text-[11px] text-muted">Aliases: rfid, memberid</span>
              </div>
              <div className="rounded-lg border border-border bg-background p-2.5">
                <span className="font-mono font-medium text-text">first_name</span>
                <p className="mt-0.5 text-muted">Given first name</p>
                <span className="text-[11px] text-muted">Aliases: firstname, first</span>
              </div>
              <div className="rounded-lg border border-border bg-background p-2.5">
                <span className="font-mono font-medium text-text">last_name</span>
                <p className="mt-0.5 text-muted">Family name / surname</p>
                <span className="text-[11px] text-muted">Aliases: surname, lastname, last</span>
              </div>
              <div className="rounded-lg border border-border bg-background p-2.5">
                <span className="font-mono font-medium text-text">nickname</span>
                <p className="mt-0.5 text-muted">Display / call sign name</p>
                <span className="text-[11px] text-muted">Aliases: nick_name, nick</span>
              </div>
              <div className="rounded-lg border border-border bg-background p-2.5">
                <span className="font-mono font-medium text-text">role</span>
                <p className="mt-0.5 text-muted">e.g. Member, Prayer Coach, Usher, OIC</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-2.5">
                <span className="font-mono font-medium text-text">category</span>
                <p className="mt-0.5 text-muted">e.g. Adults, Youth, Kids</p>
              </div>
            </div>
          </div>

          {/* Optional Fields */}
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-text">
              <span className="flex h-2 w-2 rounded-full bg-secondary" />
              <span>Common Optional Columns</span>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border border-border bg-background p-2.5">
                <span className="font-mono font-medium text-text">email</span>
                <p className="mt-0.5 text-muted">
                  Unique valid email. Preserved if left blank on update.
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-2.5">
                <span className="font-mono font-medium text-text">phone</span>
                <p className="mt-0.5 text-muted">Mobile or contact number. Preserved if blank.</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-2.5">
                <span className="font-mono font-medium text-text">date_of_birth</span>
                <p className="mt-0.5 text-muted">Birthdate (YYYY-MM-DD, M/D/YY, or M/D/YYYY)</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-2.5">
                <span className="font-mono font-medium text-text">
                  first_sunday ... fifth_sunday
                </span>
                <p className="mt-0.5 text-muted">e.g. 9AM, 12NN or comma-separated services</p>
                <span className="text-[11px] text-muted">
                  Aliases: 1st_sunday, 2nd_sunday, etc.
                </span>
              </div>
              <div className="rounded-lg border border-border bg-background p-2.5">
                <span className="font-mono font-medium text-text">start_date</span>
                <p className="mt-0.5 text-muted">Date joined or started serving (YYYY-MM-DD)</p>
                <span className="text-[11px] text-muted">Aliases: date_joined, joined_date</span>
              </div>
              <div className="rounded-lg border border-border bg-background p-2.5">
                <span className="font-mono font-medium text-text">is_oic</span>
                <p className="mt-0.5 text-muted">Officer in charge flag (true / false / 1 / 0)</p>
              </div>
            </div>
          </div>

          {/* Upsert & Matching Rules */}
          <div className="rounded-lg border border-border bg-background p-3 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-text">
              <Info className="h-4 w-4 text-primary" />
              <span>Matching & Upsert Behavior</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-muted">
              <li>
                <strong className="text-text">Insert (New Member):</strong> Triggered when neither{' '}
                <code className="text-text">member_id</code> nor the Name Triplet (
                <code className="text-text">first_name + last_name + nickname</code>) matches any
                existing user.
              </li>
              <li>
                <strong className="text-text">Update (Existing Member):</strong> Triggered when{' '}
                <code className="text-text">member_id</code> matches an existing record.
              </li>
              <li>
                <strong className="text-text">Update Member ID (RFID Reassignment):</strong>{' '}
                Triggered when <code className="text-text">member_id</code> is new, but the Name
                Triplet matches exactly one existing user. The member&apos;s RFID will be updated
                safely.
              </li>
              <li>
                <strong className="text-text">Conflict Protection:</strong> If RFID matches Member A
                while Name Triplet matches Member B, the import is rejected to protect against
                accidental overwrites.
              </li>
            </ul>
          </div>

          {/* Copyable Template */}
          <div className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-center justify-between pb-2">
              <span className="font-semibold text-text">Sample CSV Template</span>
              <button
                type="button"
                onClick={() => void handleCopyTemplate()}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text hover:bg-background transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {hasCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-secondary" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Template</span>
                  </>
                )}
              </button>
            </div>
            <pre className="overflow-x-auto rounded bg-surface p-2 text-[11px] font-mono text-muted">
              {SAMPLE_CSV}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
