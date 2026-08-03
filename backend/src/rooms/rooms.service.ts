import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

// Group Study System — rooms/servers, membership, and sharing notes/summaries.
// Video call + call communication are handled by a WebRTC signaling layer
// on the frontend; this service manages membership and shared content only.
// No screen sharing, whiteboards, moderation, or permissions, per spec.
@Injectable()
export class RoomsService {
  constructor(private readonly supabase: SupabaseService) {}

  create(name: string, createdBy: string) {
    return this.supabase.client
      .from('rooms')
      .insert({ name, created_by: createdBy })
      .select()
      .single();
  }

  list() {
    return this.supabase.client.from('rooms').select('*');
  }

  getOne(roomId: string) {
    return this.supabase.client.from('rooms').select('*').eq('id', roomId).single();
  }

  join(roomId: string, userId: string) {
    return this.supabase.client
      .from('room_members')
      .insert({ room_id: roomId, user_id: userId })
      .select()
      .single();
  }

  shareNote(roomId: string, noteId: string, sharedBy: string) {
    return this.supabase.client
      .from('room_shared_notes')
      .insert({ room_id: roomId, note_id: noteId, shared_by: sharedBy })
      .select()
      .single();
  }

  shareSummary(roomId: string, summaryId: string, sharedBy: string) {
    return this.supabase.client
      .from('room_shared_summaries')
      .insert({ room_id: roomId, summary_id: summaryId, shared_by: sharedBy })
      .select()
      .single();
  }
}
