import { Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  create(@Body() body: { name: string; createdBy: string }) {
    return this.roomsService.create(body.name, body.createdBy);
  }

  @Get()
  list() {
    return this.roomsService.list();
  }

  @Get(':roomId')
  getOne(@Param('roomId') roomId: string) {
    return this.roomsService.getOne(roomId);
  }

  @Post(':roomId/join')
  join(@Param('roomId') roomId: string, @Body() body: { userId: string }) {
    return this.roomsService.join(roomId, body.userId);
  }

  @Get(':roomId/messages')
  listMessages(@Param('roomId') roomId: string) {
    return this.roomsService.listMessages(roomId);
  }

  @Post(':roomId/messages')
  createMessage(
    @Param('roomId') roomId: string,
    @Body() body: {
      userId: string;
      username: string;
      text: string;
      type?: 'text' | 'note' | 'summary';
      noteTitle?: string;
    },
  ) {
    return this.roomsService.createMessage(roomId, body);
  }

  @Post(':roomId/messages/upload')
  @UseInterceptors(FileInterceptor('file'))
  createMessageWithAttachment(
    @Param('roomId') roomId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      userId: string;
      username: string;
      text?: string;
    },
  ) {
    return this.roomsService.createMessageWithAttachment(roomId, body, file);
  }

  @Post(':roomId/share-note')
  shareNote(@Param('roomId') roomId: string, @Body() body: { noteId: string; sharedBy: string }) {
    return this.roomsService.shareNote(roomId, body.noteId, body.sharedBy);
  }

  @Post(':roomId/share-summary')
  shareSummary(@Param('roomId') roomId: string, @Body() body: { summaryId: string; sharedBy: string }) {
    return this.roomsService.shareSummary(roomId, body.summaryId, body.sharedBy);
  }
}
