import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(private readonly supabase: SupabaseService) {}

  private sign(userId: string, email: string) {
    return jwt.sign(
      { userId, email },
      process.env.JWT_SECRET as string,
      { expiresIn: '30d' },
    );
  }

  verify(token: string): { userId: string; email: string } | null {
    try {
      return jwt.verify(token, process.env.JWT_SECRET as string) as any;
    } catch {
      return null;
    }
  }

  async register(email: string, username: string, password: string) {
    // Check if email already taken
    const { data: existing } = await this.supabase.client
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) return { ok: false, error: 'Email already in use' };

    // Check username
    const { data: existingUsername } = await this.supabase.client
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (existingUsername) return { ok: false, error: 'Username already taken' };

    const id = randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    const { data, error } = await this.supabase.client
      .from('profiles')
      .insert({ id, email, username, password_hash: passwordHash })
      .select('id, email, username, coins, created_at')
      .single();

    if (error) return { ok: false, error: error.message };

    const token = this.sign(id, email);
    return { ok: true, token, user: data };
  }

  async login(email: string, password: string) {
    const { data: user } = await this.supabase.client
      .from('profiles')
      .select('id, email, username, password_hash, coins')
      .eq('email', email)
      .maybeSingle();

    if (!user) return { ok: false, error: 'No account found with that email' };

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return { ok: false, error: 'Wrong password' };

    const token = this.sign(user.id, user.email);
    const { password_hash, ...safeUser } = user;
    return { ok: true, token, user: safeUser };
  }

  // Legacy — kept for backward compat during transition
  async ensureProfile(userId: string, username: string) {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .upsert(
        { id: userId, username, email: `${userId}@local.dev`, password_hash: '' },
        { onConflict: 'id', ignoreDuplicates: true },
      )
      .select()
      .single();

    if (error && error.code !== '23505') return { ok: false, error: error.message };
    return { ok: true, data };
  }
}
