import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly supabase: SupabaseService) {}

  private async getPdfText(moduleId: string): Promise<string> {
    const { data } = await this.supabase.client
      .from('module_sources')
      .select('source_text')
      .eq('module_id', moduleId);

    return (data || [])
      .map((s) => s.source_text)
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 8000);
  }

  private async callModel(systemPrompt: string, userPrompt: string): Promise<any> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || 'openrouter/auto';

    if (!apiKey) {
      this.logger.warn('OPENROUTER_API_KEY not set.');
      return { error: 'OPENROUTER_API_KEY not configured' };
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:5173',
        'X-Title': 'EduClass Mingle',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 2000,
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`OpenRouter error ${res.status}: ${body}`);
      throw new Error(`OpenRouter request failed (${res.status})`);
    }

    const json = await res.json();
    const raw = json.choices?.[0]?.message?.content ?? '{}';

    try {
      return JSON.parse(raw);
    } catch {
      // Fallback: extract JSON from markdown code blocks
      const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        try { return JSON.parse(match[1].trim()); } catch {}
      }
      const braceMatch = raw.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        try { return JSON.parse(braceMatch[0]); } catch {}
      }
      this.logger.warn('Non-JSON response:', raw.slice(0, 200));
      return { raw };
    }
  }

  private noSource(text: string) {
    return text ? '' : 'No study material added yet. Say so in your output instead of inventing content.';
  }

  // ── Row -> frontend shape mappers ──────────────────────────────────
  private mapFlashcard(row: any) {
    return { question: row.question, answer: row.answer };
  }

  private mapQuiz(row: any) {
    return {
      question: row.question,
      options: Array.isArray(row.choices) ? row.choices : [],
      answer: row.correct_choice,
      // Not persisted in the DB (quizzes table has no explanation column),
      // so cached/reloaded quizzes won't have one. See note below.
      explanation: row.explanation || '',
    };
  }

  private mapQa(row: any) {
    return { question: row.question, answer: row.expected_answer };
  }

  // ── Flashcards ────────────────────────────────────────────────────
  async generateFlashcards(moduleId: string, regenerate = false) {
    try {
      if (!regenerate) {
        const { data: cached } = await this.supabase.client
          .from('flashcards').select('*').eq('module_id', moduleId);
        if (cached && cached.length > 0) {
          return { flashcards: cached.map((r: any) => this.mapFlashcard(r)) };
        }
      } else {
        await this.supabase.client.from('flashcards').delete().eq('module_id', moduleId);
      }

      const text = await this.getPdfText(moduleId);
      const result = await this.callModel(
        'Generate study flashcards. Respond ONLY with JSON: {"flashcards": [{"question":"...","answer":"..."}]}. Make 8-12 flashcards.',
        `${this.noSource(text)}\n\nMaterial:\n${text || '(none)'}`,
      );

      const cards = Array.isArray(result.flashcards) ? result.flashcards : [];
      if (cards.length === 0) return { flashcards: [], warning: result.error || 'No flashcards generated' };

      const { data } = await this.supabase.client
        .from('flashcards')
        .insert(cards.map((c: any) => ({ module_id: moduleId, question: c.question, answer: c.answer })))
        .select();
      return { flashcards: (data || []).map((r: any) => this.mapFlashcard(r)) };
    } catch (err: any) {
      this.logger.error('generateFlashcards failed:', err.message);
      return { flashcards: [], error: err.message };
    }
  }

  // ── Quiz ──────────────────────────────────────────────────────────
  async generateQuiz(moduleId: string, regenerate = false) {
    try {
      if (!regenerate) {
        const { data: cached } = await this.supabase.client
          .from('quizzes').select('*').eq('module_id', moduleId);
        if (cached && cached.length > 0) {
          return { quiz: cached.map((r: any) => this.mapQuiz(r)) };
        }
      } else {
        await this.supabase.client.from('quizzes').delete().eq('module_id', moduleId);
      }

      const text = await this.getPdfText(moduleId);
      const result = await this.callModel(
        'Generate multiple-choice quiz questions. Respond ONLY with JSON: {"quiz":[{"question":"...","choices":["A","B","C","D"],"correctChoice":"A","explanation":"..."}]}. Make 5-8 questions.',
        `${this.noSource(text)}\n\nMaterial:\n${text || '(none)'}`,
      );

      const questions = Array.isArray(result.quiz) ? result.quiz : [];
      if (questions.length === 0) return { quiz: [], warning: result.error || 'No quiz generated' };

      const { data } = await this.supabase.client
        .from('quizzes')
        .insert(questions.map((q: any) => ({
          module_id: moduleId,
          question: q.question,
          choices: q.choices,
          correct_choice: q.correctChoice,
        })))
        .select();

      // The quizzes table has no explanation column, so merge the
      // explanation back in from the freshly generated result just for
      // this response. It won't survive a page reload from cache.
      const withExplanations = (data || []).map((row: any, i: number) => ({
        ...this.mapQuiz(row),
        explanation: questions[i]?.explanation || '',
      }));
      return { quiz: withExplanations };
    } catch (err: any) {
      this.logger.error('generateQuiz failed:', err.message);
      return { quiz: [], error: err.message };
    }
  }

  // ── Q&A Practice ──────────────────────────────────────────────────
  async generateQaPractice(moduleId: string, regenerate = false) {
    try {
      if (!regenerate) {
        const { data: cached } = await this.supabase.client
          .from('qa_practice').select('*').eq('module_id', moduleId);
        if (cached && cached.length > 0) {
          return { qa: cached.map((r: any) => this.mapQa(r)) };
        }
      } else {
        await this.supabase.client.from('qa_practice').delete().eq('module_id', moduleId);
      }

      const text = await this.getPdfText(moduleId);
      const result = await this.callModel(
        'Generate open-ended Q&A questions. Respond ONLY with JSON: {"qa":[{"question":"...","expectedAnswer":"..."}]}. Make 5-8 questions.',
        `${this.noSource(text)}\n\nMaterial:\n${text || '(none)'}`,
      );

      const items = Array.isArray(result.qa) ? result.qa : [];
      if (items.length === 0) return { qa: [], warning: result.error || 'No Q&A generated' };

      const { data } = await this.supabase.client
        .from('qa_practice')
        .insert(items.map((i: any) => ({
          module_id: moduleId,
          question: i.question,
          expected_answer: i.expectedAnswer,
        })))
        .select();
      return { qa: (data || []).map((r: any) => this.mapQa(r)) };
    } catch (err: any) {
      this.logger.error('generateQaPractice failed:', err.message);
      return { qa: [], error: err.message };
    }
  }

  // ── Summary ───────────────────────────────────────────────────────
  async generateSummary(moduleId: string, regenerate = false) {
    try {
      if (!regenerate) {
        const { data: cached } = await this.supabase.client
          .from('module_summaries').select('*').eq('module_id', moduleId).maybeSingle();
        if (cached) return { summary: cached.content };
      } else {
        await this.supabase.client.from('module_summaries').delete().eq('module_id', moduleId);
      }

      const text = await this.getPdfText(moduleId);
      const result = await this.callModel(
        'Write a study summary. Respond ONLY with JSON: {"summary":"..."} — plain text with markdown headings/bullets inside.',
        `${this.noSource(text)}\n\nMaterial:\n${text || '(none)'}`,
      );

      const content = result.summary || result.error || 'Summary generation failed.';

      try {
        await this.supabase.client
          .from('module_summaries')
          .insert({ module_id: moduleId, content })
          .select().single();
      } catch (dbErr: any) {
        this.logger.warn('Could not persist summary:', dbErr.message);
      }

      return { summary: content };
    } catch (err: any) {
      this.logger.error('generateSummary failed:', err.message);
      return { summary: null, error: err.message };
    }
  }

  // ── Load all cached results for a module (called on page load) ────
  async getModuleAiData(moduleId: string) {
    const [{ data: flashcards }, { data: quiz }, { data: qa }, { data: summary }] = await Promise.all([
      this.supabase.client.from('flashcards').select('*').eq('module_id', moduleId),
      this.supabase.client.from('quizzes').select('*').eq('module_id', moduleId),
      this.supabase.client.from('qa_practice').select('*').eq('module_id', moduleId),
      this.supabase.client.from('module_summaries').select('*').eq('module_id', moduleId).maybeSingle(),
    ]);
    return {
      flashcards: (flashcards || []).map((r: any) => this.mapFlashcard(r)),
      quiz: (quiz || []).map((r: any) => this.mapQuiz(r)),
      qa: (qa || []).map((r: any) => this.mapQa(r)),
      summary: summary?.content || null,
    };
  }
}