import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Single shared Supabase client, using the service role key.
// Every feature module (Solo Study, Pomodoro, Notes, Group Study,
// Social Media, Coins, Profile) reads/writes through this client.
@Injectable()
export class SupabaseService {
  public readonly client: SupabaseClient;

  constructor() {
    this.client = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    );
  }
}
