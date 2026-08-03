import { Module } from '@nestjs/common';
import { PdfsService } from './pdfs.service';

@Module({
  providers: [PdfsService],
  exports: [PdfsService],
})
export class PdfsModule {}
