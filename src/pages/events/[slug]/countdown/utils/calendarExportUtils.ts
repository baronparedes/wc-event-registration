import type { AdminEvent } from '@/lib/domain/events';

function formatToIcsDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function generateIcsContent(event: AdminEvent): string {
  const start = event.starts_at ? formatToIcsDate(event.starts_at) : '';
  // If ends_at is not provided, default to 1 hour after start
  let end = '';
  if (event.ends_at) {
    end = formatToIcsDate(event.ends_at);
  } else if (event.starts_at) {
    const startDate = new Date(event.starts_at);
    startDate.setHours(startDate.getHours() + 1);
    end = formatToIcsDate(startDate.toISOString());
  }

  const now = formatToIcsDate(new Date().toISOString());

  let ics = 'BEGIN:VCALENDAR\n';
  ics += 'VERSION:2.0\n';
  ics += 'PRODID:-//WelcomeHub//EN\n';
  ics += 'CALSCALE:GREGORIAN\n';
  ics += 'BEGIN:VEVENT\n';
  ics += `UID:${event.id}-${now}@welcomehub\n`;
  ics += `DTSTAMP:${now}\n`;
  if (start) ics += `DTSTART:${start}\n`;
  if (end) ics += `DTEND:${end}\n`;
  ics += `SUMMARY:${event.title}\n`;
  if (event.description) {
    const desc = event.description.replace(/\n/g, '\\n');
    ics += `DESCRIPTION:${desc}\n`;
  }
  if (event.location) {
    ics += `LOCATION:${event.location}\n`;
  }
  ics += 'END:VEVENT\n';
  ics += 'END:VCALENDAR';
  return ics;
}

export function downloadIcsFile(event: AdminEvent) {
  const icsContent = generateIcsContent(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const sanitizedTitle = (event.slug || 'event').replace(/[^a-zA-Z0-9_-]/g, '_');
  link.setAttribute('download', `${sanitizedTitle}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatGoogleCalendarDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function getGoogleCalendarUrl(event: AdminEvent): string {
  const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  const start = event.starts_at ? formatGoogleCalendarDate(event.starts_at) : '';
  let end = '';
  if (event.ends_at) {
    end = formatGoogleCalendarDate(event.ends_at);
  } else if (event.starts_at) {
    const startDate = new Date(event.starts_at);
    startDate.setHours(startDate.getHours() + 1);
    end = formatGoogleCalendarDate(startDate.toISOString());
  }

  const dates = start && end ? `&dates=${start}/${end}` : start ? `&dates=${start}/${start}` : '';
  const text = `&text=${encodeURIComponent(event.title)}`;
  const details = event.description ? `&details=${encodeURIComponent(event.description)}` : '';
  const location = event.location ? `&location=${encodeURIComponent(event.location)}` : '';

  return `${baseUrl}${text}${dates}${details}${location}`;
}

export function getOutlookCalendarUrl(event: AdminEvent): string {
  const baseUrl =
    'https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent';
  const start = event.starts_at ? new Date(event.starts_at).toISOString() : '';
  let end = '';
  if (event.ends_at) {
    end = new Date(event.ends_at).toISOString();
  } else if (event.starts_at) {
    const startDate = new Date(event.starts_at);
    startDate.setHours(startDate.getHours() + 1);
    end = startDate.toISOString();
  }

  const subject = `&subject=${encodeURIComponent(event.title)}`;
  const startdt = start ? `&startdt=${encodeURIComponent(start)}` : '';
  const enddt = end ? `&enddt=${encodeURIComponent(end)}` : '';
  const body = event.description ? `&body=${encodeURIComponent(event.description)}` : '';
  const location = event.location ? `&location=${encodeURIComponent(event.location)}` : '';

  return `${baseUrl}${subject}${startdt}${enddt}${body}${location}`;
}

export function getYahooCalendarUrl(event: AdminEvent): string {
  const baseUrl = 'https://calendar.yahoo.com/?v=60';
  const start = event.starts_at ? formatGoogleCalendarDate(event.starts_at) : '';
  let end = '';
  if (event.ends_at) {
    end = formatGoogleCalendarDate(event.ends_at);
  } else if (event.starts_at) {
    const startDate = new Date(event.starts_at);
    startDate.setHours(startDate.getHours() + 1);
    end = formatGoogleCalendarDate(startDate.toISOString());
  }

  const title = `&TITLE=${encodeURIComponent(event.title)}`;
  const st = start ? `&ST=${start}` : '';
  const et = end ? `&ET=${end}` : '';
  const desc = event.description ? `&DESC=${encodeURIComponent(event.description)}` : '';
  const in_loc = event.location ? `&in_loc=${encodeURIComponent(event.location)}` : '';

  return `${baseUrl}${title}${st}${et}${desc}${in_loc}`;
}
