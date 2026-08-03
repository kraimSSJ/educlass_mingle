import { useEffect, useState } from 'react';
import { API_URL } from './supabaseClient';

const USER_ID_KEY = 'educlass_uid';

/**
 * Generates a persistent UUID for this browser.
 * Calls the backend to upsert a profiles row so every FK constraint passes.
 * Returns the UUID once the profile is ready, null while initialising.
 */
export function useUserId(): string | null {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(USER_ID_KEY, id);
    }

    const username = 'user_' + id.slice(0, 8);

    fetch(`${API_URL}/auth/ensure-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id, username }),
    })
      .then(r => r.json())
      .then(result => {
        if (result?.ok === false) {
          console.warn('ensure-profile failed:', result.error);
        }
        // Set userId regardless — worst case inserts fail but reads still work
        setUserId(id);
      })
      .catch(() => {
        // Backend unreachable — still set so UI isn't blocked
        setUserId(id);
      });
  }, []);

  return userId;
}
