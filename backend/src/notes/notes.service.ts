import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class NotesService {
  constructor(private readonly supabase: SupabaseService) {}

  getForUser(userId: string) {
    return this.supabase.client
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
  }

  create(userId: string, content: string, title?: string, moduleId?: string | null) {
    return this.supabase.client
      .from('notes')
      .insert({
        user_id: userId,
        content: content ?? '',
        title: title ?? 'Untitled Note',
        module_id: moduleId ?? null,
      })
      .select()
      .single();
  }

  update(noteId: string, content: string, title?: string, moduleId?: string | null) {
    const patch: Record<string, any> = {
      content,
      updated_at: new Date().toISOString(),
    };
    if (title !== undefined) patch.title = title;
    if (moduleId !== undefined) patch.module_id = moduleId;

    return this.supabase.client
      .from('notes')
      .update(patch)
      .eq('id', noteId)
      .select()
      .single();
  }
}
