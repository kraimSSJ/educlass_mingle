import { Module } from '@nestjs/common';
import { ModulesController } from './modules.controller';
import { ModulesService } from './modules.service';
import { PdfsModule } from '../pdfs/pdfs.module';

@Module({
  imports: [PdfsModule],
  controllers: [ModulesController],
  providers: [ModulesService],
})
export class ModulesModule {}
