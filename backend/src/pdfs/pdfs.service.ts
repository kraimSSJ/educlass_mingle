import { Injectable, Logger } from '@nestjs/common';
const pdfParse = require('pdf-parse');

@Injectable()
export class PdfsService {
  private readonly logger = new Logger(PdfsService.name);

  async extractTextFromUrl(fileUrl: string): Promise<string> {
    try {
      const res = await fetch(fileUrl);
      if (!res.ok) {
        this.logger.warn(`Could not fetch PDF at ${fileUrl}: ${res.status}`);
        return '';
      }
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return await this.extractTextFromBuffer(buffer);
    } catch (err) {
      this.logger.warn(`PDF extraction failed for ${fileUrl}: ${(err as Error).message}`);
      return '';
    }
  }

  async extractTextFromBuffer(buffer: Buffer): Promise<string> {
    try {
      const parsed = await pdfParse(buffer);
      return (parsed.text || '').trim();
    } catch (err) {
      this.logger.warn(`PDF buffer extraction failed: ${(err as Error).message}`);
      return '';
    }
  }
}
