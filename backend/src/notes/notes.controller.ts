import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { NotesService } from './notes.service';

@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get('user/:userId')
  getForUser(@Param('userId') userId: string) {
    return this.notesService.getForUser(userId);
  }

  @Post()
  create(@Body() body: {
    userId: string;
    content?: string;
    title?: string;
    moduleId?: string | null;
  }) {
    return this.notesService.create(
      body.userId,
      body.content ?? '',
      body.title,
      body.moduleId,
    );
  }

  @Put(':noteId')
  update(
    @Param('noteId') noteId: string,
    @Body() body: { content?: string; title?: string; moduleId?: string | null },
  ) {
    return this.notesService.update(
      noteId,
      body.content ?? '',
      body.title,
      body.moduleId,
    );
  }
}
