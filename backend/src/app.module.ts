import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { ModulesModule } from './modules/modules.module';
import { PdfsModule } from './pdfs/pdfs.module';
import { AiModule } from './ai/ai.module';
import { PomodoroModule } from './pomodoro/pomodoro.module';
import { NotesModule } from './notes/notes.module';
import { RoomsModule } from './rooms/rooms.module';
import { SocialModule } from './social/social.module';
import { CoinsModule } from './coins/coins.module';
import { ProfileModule } from './profile/profile.module';

@Module({
  imports: [
    // Must be first — loads .env into process.env before any service reads it
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    AuthModule,
    SupabaseModule,
    ModulesModule, // Part 1: Solo Studying
    PdfsModule, // Part 1: PDF text extraction
    AiModule, // Part 1: per-module AI assistant
    PomodoroModule, // Part 2: Pomodoro
    NotesModule, // Part 3: Notes
    RoomsModule, // Part 4: Group Studying
    SocialModule, // Part 5: Social Media
    CoinsModule, // Part 6: Coins
    ProfileModule, // Part 7: Profile (room)
  ],
})
export class AppModule {}
