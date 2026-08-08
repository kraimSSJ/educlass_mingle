import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
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

  async listMessages(roomId: string) {
    const { data, error } = await this.supabase.client
      .from('room_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    return {
      data: (data ?? []).map(this.toChatMessage),
      error,
    };
  }

  async createMessage(
    roomId: string,
    body: {
      userId: string;
      username: string;
      text: string;
      type?: 'text' | 'note' | 'summary';
      noteTitle?: string;
      attachmentUrl?: string;
      attachmentName?: string;
      attachmentType?: 'image' | 'pdf';
    },
  ) {
    const { data, error } = await this.supabase.client
      .from('room_messages')
      .insert({
        room_id: roomId,
        user_id: body.userId,
        username: body.username,
        text: body.text,
        type: body.type ?? 'text',
        note_title: body.noteTitle ?? null,
        attachment_url: body.attachmentUrl ?? null,
        attachment_name: body.attachmentName ?? null,
        attachment_type: body.attachmentType ?? null,
      })
      .select()
      .single();

    return {
      data: data ? this.toChatMessage(data) : null,
      error,
    };
  }

  async createMessageWithAttachment(
    roomId: string,
    body: {
      userId: string;
      username: string;
      text?: string;
    },
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Attachment file is required.');
    }

    const attachmentType = this.getAttachmentType(file.mimetype);
    const attachmentUrl = await this.uploadAttachment(roomId, file);

    return this.createMessage(roomId, {
      userId: body.userId,
      username: body.username,
      text: body.text?.trim() || file.originalname,
      type: 'text',
      attachmentUrl,
      attachmentName: file.originalname,
      attachmentType,
    });
  }

  private getAttachmentType(mimeType?: string): 'image' | 'pdf' {
    if (mimeType?.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    throw new BadRequestException('Room chat attachments must be images or PDFs.');
  }

  private async ensureAttachmentsBucket() {
    const { data: bucket, error: getErr } = await this.supabase.client.storage.getBucket('room-attachments');

    if (!bucket && getErr) {
      const { error: createErr } = await this.supabase.client.storage.createBucket('room-attachments', {
        public: true,
      });

      if (createErr) {
        throw new InternalServerErrorException(`Could not create room-attachments bucket: ${createErr.message}`);
      }

      return;
    }

    if (bucket && !bucket.public) {
      const { error: updateErr } = await this.supabase.client.storage.updateBucket('room-attachments', {
        public: true,
      });

      if (updateErr) {
        throw new InternalServerErrorException(`Could not make room-attachments bucket public: ${updateErr.message}`);
      }
    }
  }

  private async uploadAttachment(roomId: string, file: Express.Multer.File) {
    await this.ensureAttachmentsBucket();

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `${roomId}/${Date.now()}_${safeName}`;
    const { error } = await this.supabase.client.storage
      .from('room-attachments')
      .upload(storageKey, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      throw new InternalServerErrorException(`Room attachment upload failed: ${error.message}`);
    }

    const { data } = this.supabase.client.storage.from('room-attachments').getPublicUrl(storageKey);
    if (!data.publicUrl) {
      throw new InternalServerErrorException('Room attachment upload did not return a public URL.');
    }

    return data.publicUrl;
  }

  private toChatMessage(row: any) {
    return {
      id: row.id,
      userId: row.user_id,
      username: row.username,
      text: row.text,
      type: row.type,
      noteTitle: row.note_title ?? undefined,
      attachmentUrl: row.attachment_url ?? undefined,
      attachmentName: row.attachment_name ?? undefined,
      attachmentType: row.attachment_type ?? undefined,
      timestamp: new Date(row.created_at).getTime(),
    };
  }
}
