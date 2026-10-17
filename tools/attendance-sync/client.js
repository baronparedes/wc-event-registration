/**
 * Send a batch of attendance records to the Supabase Edge Function.
 */
export async function sendAttendanceBatch({
  endpoint,
  syncKey,
  targetDate,
  layoutId,
  records,
  timeoutMs = 15000,
}) {
  if (!syncKey) {
    throw new Error('Missing SYNC_API_KEY. Configure SYNC_API_KEY in .env or pass --key');
  }

  const payload = {
    date: targetDate,
    layout_id: layoutId,
    records,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sync-key': syncKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const bodyText = await res.text();
    let json;
    try {
      json = JSON.parse(bodyText);
    } catch {
      json = null;
    }

    if (!res.ok) {
      const errorMessage =
        json?.error || json?.message || `HTTP ${res.status}: ${res.statusText || bodyText}`;
      return {
        success: false,
        status: res.status,
        error: errorMessage,
      };
    }

    return {
      success: true,
      status: res.status,
      data: json,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      return {
        success: false,
        status: 408,
        error: `Request timed out after ${timeoutMs}ms`,
      };
    }
    return {
      success: false,
      status: 0,
      error: err.message || 'Network request failed',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
