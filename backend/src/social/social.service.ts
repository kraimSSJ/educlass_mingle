import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);

  constructor(private readonly supabase: SupabaseService) {}

  private async ensureSocialBucket() {
    const { data: bucket, error: getErr } = await this.supabase.client.storage.getBucket('social-media');

    if (!bucket && getErr) {
      const { error: createErr } = await this.supabase.client.storage.createBucket('social-media', {
        public: true,
      });

      if (createErr) {
        throw new InternalServerErrorException(`Could not create social-media bucket: ${createErr.message}`);
      }

      return;
    }

    if (bucket && !bucket.public) {
      const { error: updateErr } = await this.supabase.client.storage.updateBucket('social-media', {
        public: true,
      });

      if (updateErr) {
        throw new InternalServerErrorException(`Could not make social-media bucket public: ${updateErr.message}`);
      }
    }
  }

  // Uploads an image buffer to the 'social-media' Storage bucket and returns
  // its public URL. Posts/stories previously stored the raw base64 image
  // directly in the DB row (image_url/media_url as `text`), which made every
  // insert huge and made feed()/listActiveStories() re-download every
  // image's full base64 data on every single load — the actual cause of
  // posts/stories taking a long time to show up. Now we store a short URL.
  private async uploadImage(buffer: Buffer, fileName: string, mimeType?: string): Promise<string> {
    if (mimeType && !mimeType.startsWith('image/')) {
      throw new BadRequestException('Social uploads must be image files.');
    }

    await this.ensureSocialBucket();

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `social/${Date.now()}_${safeName}`;
    const { error: uploadErr } = await this.supabase.client.storage
      .from('social-media')
      .upload(storageKey, buffer, { contentType: mimeType || 'image/jpeg', upsert: true });

    if (uploadErr) {
      this.logger.warn(`Storage upload failed: ${uploadErr.message}`);
      throw new InternalServerErrorException(`Social image upload failed: ${uploadErr.message}`);
    }

    const { data } = this.supabase.client.storage.from('social-media').getPublicUrl(storageKey);
    if (!data.publicUrl) {
      throw new InternalServerErrorException('Social image upload did not return a public URL.');
    }

    return data.publicUrl;
  }

  // Creates a post. Stores content + image_url directly on the posts table.
  async createPost(userId: string, content: string, imageUrl?: string, username?: string) {
    const { data: post, error } = await this.supabase.client
      .from('posts')
      .insert({
        user_id: userId,
        caption: content, // keep caption for backwards compat
        content,
        image_url: imageUrl ?? null,
        username: username ?? null,
      })
      .select()
      .single();

    if (error) return { data: null, error };
    return { data: post, error: null };
  }

  // Accepts an optional uploaded file — uploads it to Storage first so only
  // a short URL ever lands in the posts table.
  async createPostWithImage(
    userId: string,
    content: string,
    file: Express.Multer.File | undefined,
    username?: string,
  ) {
    let imageUrl: string | undefined;
    if (file) {
      imageUrl = await this.uploadImage(file.buffer, file.originalname, file.mimetype);
    }
    return this.createPost(userId, content, imageUrl, username);
  }

  async feed() {
    const { data, error } = await this.supabase.client
      .from('posts')
      .select('*, comments(*)')
      .order('created_at', { ascending: false });

    return { data: data ?? [], error };
  }

  async addComment(postId: string, userId: string, content: string, username?: string) {
    return this.supabase.client
      .from('comments')
      .insert({ post_id: postId, user_id: userId, content, username: username ?? null })
      .select()
      .single();
  }

  addFriend(userId: string, friendId: string) {
    return this.supabase.client
      .from('friends')
      .insert({ user_id: userId, friend_id: friendId, status: 'pending' })
      .select()
      .single();
  }

  acceptFriend(userId: string, friendId: string) {
    return this.supabase.client
      .from('friends')
      .update({ status: 'accepted' })
      .eq('user_id', userId)
      .eq('friend_id', friendId)
      .select()
      .single();
  }

  async addStory(userId: string, imageUrl: string, username?: string) {
    return this.supabase.client
      .from('stories')
      .insert({
        user_id: userId,
        media_url: imageUrl,       // original required column
        image_url: imageUrl,       // new convenience column
        username: username ?? null,
      })
      .select()
      .single();
  }

  // Accepts an uploaded file — uploads it to Storage first so only a short
  // URL ever lands in the stories table.
  async addStoryWithImage(userId: string, file: Express.Multer.File, username?: string) {
    if (!file) {
      throw new BadRequestException('Story image is required.');
    }

    const imageUrl = await this.uploadImage(file.buffer, file.originalname, file.mimetype);
    return this.addStory(userId, imageUrl, username);
  }

  listActiveStories() {
    return this.supabase.client
      .from('stories')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
  }
}
