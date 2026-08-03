import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

// Pomodoro System — session state only (study / break).
// The avatar animation (hop / run / play / rest) is a frontend concern
// driven purely by whichever mode is currently active.
@Injectable()
export class PomodoroService {
  constructor(private readonly supabase: SupabaseService) {}

  start(userId: string, mode: 'study' | 'break') {
    return this.supabase.client
      .from('pomodoro_sessions')
      .insert({ user_id: userId, mode })
      .select()
      .single();
  }

  end(sessionId: string) {
    return this.supabase.client
      .from('pomodoro_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId)
      .select()
      .single();
  }
}
