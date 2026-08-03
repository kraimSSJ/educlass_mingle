import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

// Profile Customization System — the profile is a room, decorated with
// accessories bought using coins. Not a normal social profile page.
@Injectable()
export class ProfileService {
  constructor(private readonly supabase: SupabaseService) {}

  listAccessories() {
    return this.supabase.client.from('accessories').select('*');
  }

  async purchase(userId: string, accessoryId: string) {
    const { data: accessory } = await this.supabase.client
      .from('accessories')
      .select('*')
      .eq('id', accessoryId)
      .single();

    const { data: profile } = await this.supabase.client
      .from('profiles')
      .select('coins')
      .eq('id', userId)
      .single();

    if (!accessory || !profile || profile.coins < accessory.price) {
      throw new Error('Not enough coins');
    }

    await this.supabase.client
      .from('profiles')
      .update({ coins: profile.coins - accessory.price })
      .eq('id', userId);

    return this.supabase.client
      .from('owned_accessories')
      .insert({ user_id: userId, accessory_id: accessoryId })
      .select()
      .single();
  }

  getRoom(userId: string) {
    return this.supabase.client
      .from('room_layout')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
  }

  saveRoom(userId: string, placedAccessories: unknown[]) {
    return this.supabase.client
      .from('room_layout')
      .upsert({ user_id: userId, placed_accessories: placedAccessories })
      .select()
      .single();
  }
}
