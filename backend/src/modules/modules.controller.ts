import { Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ModulesService } from './modules.service';

@Controller('modules')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @Post()
  create(@Body() body: { ownerId: string; title: string }) {
    return this.modulesService.create(body.ownerId, body.title);
  }

  @Get('user/:ownerId')
  listForUser(@Param('ownerId') ownerId: string) {
    return this.modulesService.listForUser(ownerId);
  }

  // Accepts multipart/form-data with a 'file' field — extracts text server-side
  @Post(':moduleId/pdfs/upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadPdf(
    @Param('moduleId') moduleId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.modulesService.addPdfFromBuffer(moduleId, file.buffer, file.originalname);
  }

  @Post(':moduleId/pdfs')
  addPdf(@Param('moduleId') moduleId: string, @Body() body: { fileUrl: string; fileName: string }) {
    return this.modulesService.addPdf(moduleId, body.fileUrl, body.fileName);
  }

  @Post(':moduleId/sources')
  addSource(@Param('moduleId') moduleId: string, @Body() body: { sourceUrl?: string; sourceText?: string }) {
    return this.modulesService.addSource(moduleId, body.sourceUrl, body.sourceText);
  }

  @Get(':moduleId/pdfs')
  listPdfs(@Param('moduleId') moduleId: string) {
    return this.modulesService.listPdfs(moduleId);
  }

  @Get(':moduleId/sources')
  listSources(@Param('moduleId') moduleId: string) {
    return this.modulesService.listSources(moduleId);
  }
}
