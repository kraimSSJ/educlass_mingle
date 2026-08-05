import { Body, Controller, Get, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SocialService } from './social.service';

@Controller('social')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Post('posts')
  createPost(@Body() body: {
    userId: string;
    content?: string;
    caption?: string;   // accept both for compatibility
    imageUrl?: string;
    username?: string;
  }) {
    const text = body.content ?? body.caption ?? '';
    return this.socialService.createPost(body.userId, text, body.imageUrl, body.username);
  }

  @Post('posts/upload')
  @UseInterceptors(FileInterceptor('file'))
  createPostUpload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: {
      userId: string;
      content?: string;
      caption?: string;
      username?: string;
    },
  ) {
    const text = body.content ?? body.caption ?? '';
    return this.socialService.createPostWithImage(body.userId, text, file, body.username);
  }

  @Get('feed')
  feed() {
    return this.socialService.feed();
  }

  @Post('comments')
  addComment(@Body() body: { postId: string; userId: string; content: string; username?: string }) {
    return this.socialService.addComment(body.postId, body.userId, body.content, body.username);
  }

  @Post('friends')
  addFriend(@Body() body: { userId: string; friendId: string }) {
    return this.socialService.addFriend(body.userId, body.friendId);
  }

  @Post('friends/accept')
  acceptFriend(@Body() body: { userId: string; friendId: string }) {
    return this.socialService.acceptFriend(body.userId, body.friendId);
  }

  @Post('stories')
  addStory(@Body() body: {
    userId: string;
    imageUrl?: string;
    mediaUrl?: string;  // accept both
    username?: string;
  }) {
    const url = body.imageUrl ?? body.mediaUrl ?? '';
    return this.socialService.addStory(body.userId, url, body.username);
  }

  @Post('stories/upload')
  @UseInterceptors(FileInterceptor('file'))
  addStoryUpload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { userId: string; username?: string },
  ) {
    return this.socialService.addStoryWithImage(body.userId, file, body.username);
  }

  @Get('stories')
  listStories() {
    return this.socialService.listActiveStories();
  }
}
