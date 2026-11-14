import { describe, expect, it } from 'vitest';
import { resumableUpload, type UploadResponse } from './facebook.ts';

const CHUNK = 4;

/** A fake Page videos endpoint that hands out CHUNK bytes at a time and records what it received. */
function fakeFacebook(size: number) {
  const received: string[] = [];
  const phases: string[] = [];
  const post = async (form: FormData): Promise<UploadResponse> => {
    const phase = String(form.get('upload_phase'));
    phases.push(phase);
    if (phase === 'start') return { upload_session_id: 's1', video_id: 'v1', start_offset: '0', end_offset: String(Math.min(CHUNK, size)) };
    if (phase === 'transfer') {
      const chunk = form.get('video_file_chunk') as Blob;
      received.push(await chunk.text());
      const next = Number(form.get('start_offset')) + chunk.size;
      return { start_offset: String(next), end_offset: String(Math.min(next + CHUNK, size)) };
    }
    return { success: true };
  };
  return { post, received, phases };
}

describe('resumableUpload', () => {
  it('sends the whole video in the chunks Facebook asks for, then finishes', async () => {
    const facebook = fakeFacebook(10);
    const id = await resumableUpload(facebook.post, new Blob(['0123456789']), new FormData());
    expect(id).toBe('v1');
    expect(facebook.received.join('')).toBe('0123456789');
    expect(facebook.phases).toEqual(['start', 'transfer', 'transfer', 'transfer', 'finish']);
  });

  it('passes the post fields with the finish step', async () => {
    const fields = new FormData();
    fields.set('title', 'Duar!');
    let finishTitle: unknown;
    const facebook = fakeFacebook(3);
    await resumableUpload(async (form) => {
      if (form.get('upload_phase') === 'finish') finishTitle = form.get('title');
      return facebook.post(form);
    }, new Blob(['abc']), fields);
    expect(finishTitle).toBe('Duar!');
  });

  it('stops when Facebook does not move on', async () => {
    const stuck = async (form: FormData): Promise<UploadResponse> =>
      form.get('upload_phase') === 'start' ? { upload_session_id: 's', video_id: 'v', start_offset: '0', end_offset: '4' } : { start_offset: '0', end_offset: '4' };
    await expect(resumableUpload(stuck, new Blob(['0123456789']), new FormData())).rejects.toThrow(/tidak melanjutkan/);
  });

  it('fails clearly when no upload session is started', async () => {
    await expect(resumableUpload(async () => ({}), new Blob(['x']), new FormData())).rejects.toThrow(/sesi upload/);
  });
});
