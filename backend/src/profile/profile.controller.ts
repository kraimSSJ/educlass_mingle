import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ProfileService } from './profile.service';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('accessories')
  listAccessories() {
    return this.profileService.listAccessories();
  }

  @Post('purchase')
  purchase(@Body() body: { userId: string; accessoryId: string }) {
    return this.profileService.purchase(body.userId, body.accessoryId);
  }

  @Get('room/:userId')
  getRoom(@Param('userId') userId: string) {
    return this.profileService.getRoom(userId);
  }

  @Put('room/:userId')
  saveRoom(@Param('userId') userId: string, @Body() body: { placedAccessories: unknown[] }) {
    return this.profileService.saveRoom(userId, body.placedAccessories);
  }
}
