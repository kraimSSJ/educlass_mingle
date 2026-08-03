import { Body, Controller, Param, Post } from '@nestjs/common';
import { PomodoroService } from './pomodoro.service';

@Controller('pomodoro')
export class PomodoroController {
  constructor(private readonly pomodoroService: PomodoroService) {}

  @Post('start')
  start(@Body() body: { userId: string; mode: 'study' | 'break' }) {
    return this.pomodoroService.start(body.userId, body.mode);
  }

  @Post(':sessionId/end')
  end(@Param('sessionId') sessionId: string) {
    return this.pomodoroService.end(sessionId);
  }
}
