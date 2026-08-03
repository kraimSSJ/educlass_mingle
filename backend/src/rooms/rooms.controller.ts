import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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

  @Post(':roomId/share-note')
  shareNote(@Param('roomId') roomId: string, @Body() body: { noteId: string; sharedBy: string }) {
    return this.roomsService.shareNote(roomId, body.noteId, body.sharedBy);
  }

  @Post(':roomId/share-summary')
  shareSummary(@Param('roomId') roomId: string, @Body() body: { summaryId: string; sharedBy: string }) {
    return this.roomsService.shareSummary(roomId, body.summaryId, body.sharedBy);
  }
}
