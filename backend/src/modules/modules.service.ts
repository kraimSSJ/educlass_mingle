import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { PdfsService } from '../pdfs/pdfs.service';

// Solo Study System — modules, PDFs, and study sources.
@Injectable()
export class ModulesService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly pdfs: PdfsService,
  ) {}

  create(ownerId: string, title: string) {
    return this.supabase.client
      .from('modules')
      .insert({ owner_id: ownerId, title })
      .select()
      .single();
  }

  // Was returning the raw Supabase query result ({ data, error, ... })
  // instead of the actual array — the frontend called .find() directly
  // on that object and crashed. Also aliases "title" -> "name" since
  // the frontend reads mod.name.
  async listForUser(ownerId: string) {
    const { data, error } = await this.supabase.client
      .from('modules')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []).map((m: any) => ({
      id: m.id,
      name: m.title,
      title: m.title,
      createdAt: m.created_at,
    }));
  }

  async addPdf(moduleId: string, fileUrl: string, fileName: string) {
    const { data: pdf, error } = await this.supabase.client
      .from('module_pdfs')
      .insert({ module_id: moduleId, file_url: fileUrl, file_name: fileName })
      .select()
      .single();

    if (error) return { data: pdf, error };

    const text = await this.pdfs.extractTextFromUrl(fileUrl);
    if (text) {
      await this.supabase.client.from('module_sources').insert({
        module_id: moduleId,
        source_url: fileUrl,
        source_text: text,
      });
    }

    return { data: { ...pdf, filename: pdf.file_name }, error: null };
  }

  async addPdfFromBuffer(moduleId: string, buffer: Buffer, fileName: string) {
    // 1. Extract text from buffer directly
    const text = await this.pdfs.extractTextFromBuffer(buffer);

    // 2. Upload file to Supabase Storage so it can be viewed in the browser
    let fileUrl = '';
    try {
      const storageKey = `pdfs/${moduleId}/${Date.now()}_${fileName}`;
      const { error: uploadErr } = await this.supabase.client.storage
        .from('module-pdfs')
        .upload(storageKey, buffer, { contentType: 'application/pdf', upsert: true });

      if (!uploadErr) {
        const { data: urlData } = this.supabase.client.storage
          .from('module-pdfs')
          .getPublicUrl(storageKey);
        fileUrl = urlData.publicUrl;
      } else {
        // Bucket may not exist yet — not fatal, text was still extracted
        console.warn('Storage upload skipped:', uploadErr.message);
      }
    } catch (e: any) {
      console.warn('Storage upload error:', e.message);
    }

    // 3. Save the PDF record with the URL (or empty if storage not set up)
    const { data: pdf, error } = await this.supabase.client
      .from('module_pdfs')
      .insert({ module_id: moduleId, file_url: fileUrl, file_name: fileName })
      .select()
      .single();

    if (error) return { data: null, error };

    // 4. Save extracted text for AI
    if (text) {
      await this.supabase.client.from('module_sources').insert({
        module_id: moduleId,
        source_url: fileUrl || fileName,
        source_text: text,
      });
    }

    return {
      data: { ...pdf, filename: pdf.file_name, file_url: fileUrl },
      textExtracted: !!text,
      error: null,
    };
  }

  addSource(moduleId: string, sourceUrl?: string, sourceText?: string) {
    return this.supabase.client
      .from('module_sources')
      .insert({ module_id: moduleId, source_url: sourceUrl, source_text: sourceText })
      .select()
      .single();
  }

  // Same fix as listForUser: unwrap the Supabase response into a plain
  // array, and alias file_name -> filename since the frontend PDF type
  // reads pdf.filename.
  async listPdfs(moduleId: string) {
    const { data, error } = await this.supabase.client
      .from('module_pdfs')
      .select('*')
      .eq('module_id', moduleId);

    if (error) return [];
    return (data || []).map((p: any) => ({
      id: p.id,
      filename: p.file_name,
      file_url: p.file_url,
      uploadedAt: p.uploaded_at,
    }));
  }

  async listSources(moduleId: string) {
    const { data, error } = await this.supabase.client
      .from('module_sources')
      .select('*')
      .eq('module_id', moduleId);

    if (error) return [];
    return data || [];
  }
}