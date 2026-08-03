import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('modules/:moduleId/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('all')
  getAll(@Param('moduleId') moduleId: string) {
    return this.aiService.getModuleAiData(moduleId);
  }

  @Post('flashcards')
  flashcards(@Param('moduleId') moduleId: string, @Body() body?: { regenerate?: boolean }) {
    return this.aiService.generateFlashcards(moduleId, body?.regenerate ?? false);
  }

  @Post('quiz')
  quiz(@Param('moduleId') moduleId: string, @Body() body?: { regenerate?: boolean }) {
    return this.aiService.generateQuiz(moduleId, body?.regenerate ?? false);
  }

  @Post('qa-practice')
  qaPractice(@Param('moduleId') moduleId: string, @Body() body?: { regenerate?: boolean }) {
    return this.aiService.generateQaPractice(moduleId, body?.regenerate ?? false);
  }

  @Post('summary')
  summary(@Param('moduleId') moduleId: string, @Body() body?: { regenerate?: boolean }) {
    return this.aiService.generateSummary(moduleId, body?.regenerate ?? false);
  }
}
