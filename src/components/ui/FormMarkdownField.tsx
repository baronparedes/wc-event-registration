import { useId, useMemo } from 'react';

import EasyMDE from 'easymde';
import 'easymde/dist/easymde.min.css';
import { Controller } from 'react-hook-form';
import type { Control, FieldValues, Path } from 'react-hook-form';
import SimpleMdeReact from 'react-simplemde-editor';

interface FormMarkdownFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  required?: boolean;
}

const TOOLBAR_CONFIG: EasyMDE.Options['toolbar'] = [
  {
    name: 'heading',
    action: EasyMDE.toggleHeadingSmaller,
    className: 'btn-heading',
    title: 'Heading',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12h12"/><path d="M6 20V4"/><path d="M18 20V4"/></svg>',
  },
  {
    name: 'bold',
    action: EasyMDE.toggleBold,
    className: 'btn-bold',
    title: 'Bold',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12h9a4 4 0 0 1 0 8H6v-8Z"/><path d="M6 4h8a4 4 0 0 1 0 8H6V4Z"/></svg>',
  },
  {
    name: 'italic',
    action: EasyMDE.toggleItalic,
    className: 'btn-italic',
    title: 'Italic',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/></svg>',
  },
  {
    name: 'strikethrough',
    action: EasyMDE.toggleStrikethrough,
    className: 'btn-strikethrough',
    title: 'Strikethrough',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" x2="20" y1="12" y2="12"/></svg>',
  },
  '|',
  {
    name: 'quote',
    action: EasyMDE.toggleBlockquote,
    className: 'btn-quote',
    title: 'Quote',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/></svg>',
  },
  {
    name: 'code',
    action: EasyMDE.toggleCodeBlock,
    className: 'btn-code',
    title: 'Code Block',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  },
  {
    name: 'unordered-list',
    action: EasyMDE.toggleUnorderedList,
    className: 'btn-unordered-list',
    title: 'Generic List',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>',
  },
  {
    name: 'ordered-list',
    action: EasyMDE.toggleOrderedList,
    className: 'btn-ordered-list',
    title: 'Numbered List',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" x2="21" y1="6" y2="6"/><line x1="10" x2="21" y1="12" y2="12"/><line x1="10" x2="21" y1="18" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>',
  },
  '|',
  {
    name: 'link',
    action: EasyMDE.drawLink,
    className: 'btn-link',
    title: 'Create Link',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  },
  {
    name: 'image',
    action: EasyMDE.drawImage,
    className: 'btn-image',
    title: 'Insert Image',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
  },
  {
    name: 'table',
    action: EasyMDE.drawTable,
    className: 'btn-table',
    title: 'Insert Table',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>',
  },
  {
    name: 'horizontal-rule',
    action: EasyMDE.drawHorizontalRule,
    className: 'btn-hr',
    title: 'Insert Horizontal Line',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" x2="19" y1="12" y2="12"/><line x1="2" x2="3" y1="12" y2="12"/><line x1="21" x2="22" y1="12" y2="12"/></svg>',
  },
  '|',
  {
    name: 'preview',
    action: EasyMDE.togglePreview,
    className: 'btn-preview no-disable',
    title: 'Toggle Preview',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>',
  },
  {
    name: 'side-by-side',
    action: EasyMDE.toggleSideBySide,
    className: 'btn-side-by-side no-disable no-mobile',
    title: 'Toggle Side by Side',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/></svg>',
  },
  {
    name: 'fullscreen',
    action: EasyMDE.toggleFullScreen,
    className: 'btn-fullscreen no-disable no-mobile',
    title: 'Toggle Fullscreen',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>',
  },
  '|',
  {
    name: 'undo',
    action: EasyMDE.undo,
    className: 'btn-undo no-disable',
    title: 'Undo',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>',
  },
  {
    name: 'redo',
    action: EasyMDE.redo,
    className: 'btn-redo no-disable',
    title: 'Redo',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>',
  },
  '|',
  {
    name: 'close',
    action: (editor: EasyMDE) => {
      if (editor.isSideBySideActive()) {
        EasyMDE.toggleSideBySide(editor);
      } else if (editor.isFullscreenActive()) {
        EasyMDE.toggleFullScreen(editor);
      } else if (editor.isPreviewActive()) {
        EasyMDE.togglePreview(editor);
      }
    },
    className: 'btn-close no-disable',
    title: 'Exit Fullscreen / Side-by-Side (Esc)',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  },
];

export function FormMarkdownField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  required,
}: FormMarkdownFieldProps<T>) {
  const id = useId();

  const options = useMemo(() => {
    return {
      autoDownloadFontAwesome: false,
      autofocus: false,
      spellChecker: false,
      status: false,
      toolbar: TOOLBAR_CONFIG,
      placeholder: placeholder || 'Enter markdown text...',
    };
  }, [placeholder]);

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <div>
            <div className={`prose-sm ${error ? 'border-red-500' : ''}`}>
              <SimpleMdeReact id={id} value={value || ''} onChange={onChange} options={options} />
            </div>
            {error && <p className="mt-1 text-sm text-red-500">{error.message}</p>}
          </div>
        )}
      />
    </div>
  );
}
