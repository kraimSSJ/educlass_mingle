import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

// Coin System — earn by studying / staying in the app, spend on profile customization.
@Injectable()
export class CoinsService {
  constructor(private readonly supabase: SupabaseService) {}

  async earn(userId: string, amount: number, reason: 'studying' | 'staying_in_app') {
    await this.supabase.client
      .from('coin_transactions')
      .insert({ user_id: userId, amount, reason });
    return this.adjustBalance(userId, amount);
  }

  async spend(userId: string, amount: number) {
    await this.supabase.client
      .from('coin_transactions')
      .insert({ user_id: userId, amount: -amount, reason: 'profile_customization' });
    return this.adjustBalance(userId, -amount);
  }

  private async adjustBalance(userId: string, delta: number) {
    const { data: profile } = await this.supabase.client
      .from('profiles')
      .select('coins')
      .eq('id', userId)
      .single();
    const newBalance = (profile?.coins || 0) + delta;
    const { data } = await this.supabase.client
      .from('profiles')
      .update({ coins: newBalance })
      .eq('id', userId)
      .select()
      .single();
    return data;
  }
}
