import { z } from 'zod';
import { ACTIONS, HELD_ITEMS, EXPRESSIONS, FORMATS, SCENE_TYPES, CHARACTERS, BACKGROUNDS, SCENE_PROPS, MOODS, AGE_GROUPS } from '@kantor/shared/constants';

const speaker = z.enum([...CHARACTERS, 'narrator']);

export const IdeaSchema = z.object({
  title: z.string(),
  series: z.string().describe('series id from kantor.config.json'),
  age: z.enum(AGE_GROUPS),
  moralMessage: z.string(),
  format: z.enum(FORMATS).describe("'standard' = 16:9 video 3–5 minutes, 'short' = vertical YouTube Shorts < 60 seconds"),
  reason: z.string().describe('reason based on research data'),
  references: z.array(z.string()),
});

/** Research result with at least `minIdeas` ideas. */
export const researchSchema = (minIdeas = 3) =>
  z.object({
    report: z.string().describe('research report in Markdown'),
    ideas: z.array(IdeaSchema).min(minIdeas).max(Math.max(5, minIdeas + 2)),
  });

export const EvidenceSchema = z.object({
  type: z.enum(['ayat', 'hadits', 'doa', 'atsar']),
  arabicText: z.string().optional(),
  latin: z.string().optional(),
  translation: z.string(),
  source: z.string(),
});

export const ScriptSchema = z.object({
  title: z.string(),
  summary: z.string(),
  scenes: z
    .array(
      z.object({
        type: z.enum(SCENE_TYPES),
        speaker,
        narration: z.string(),
        visualDirection: z.string(),
      }),
    )
    .min(3)
    .max(16),
  evidences: z.array(EvidenceSchema),
});

export const ReviewSchema = z.object({
  decision: z.enum(['approved', 'needs_revision']),
  score: z.number().min(1).max(10),
  notes: z.array(z.string()),
  humanCheck: z.array(z.string()),
});

export const SceneSchema = z.object({
  type: z.enum(SCENE_TYPES),
  speaker,
  narration: z.string(),
  background: z.enum(BACKGROUNDS),
  characters: z.array(z.enum(CHARACTERS)).max(3),
  expression: z.enum(EXPRESSIONS),
  screenText: z.string().optional(),
  prayer: z.object({ arabic: z.string(), latin: z.string(), meaning: z.string() }).optional(),
  props: z.array(z.enum(SCENE_PROPS)).max(3).optional().describe('supporting props around characters'),
  actions: z
    .array(z.object({ character: z.enum(CHARACTERS), action: z.enum(ACTIONS), heldItem: z.enum(HELD_ITEMS).optional() }))
    .max(3)
    .optional()
    .describe('what characters are doing in this scene'),
});

export const DirectorSchema = z.object({ scenes: z.array(SceneSchema) });

export const MetadataSchema = z.object({
  title: z.string().max(100),
  description: z.string(),
  tags: z.array(z.string()),
  thumbnailText: z.string(),
});

export const PublishPlanSchema = z.object({
  videosPerDay: z.number().int().min(1).max(6).describe('maximum videos published per day, all formats'),
  days: z.array(z.number().int().min(0).max(6)).min(1).describe('publish days, 0 = Sunday … 6 = Saturday'),
  slots: z
    .array(
      z.object({
        time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).describe('HH:mm, channel timezone'),
        format: z.enum(['standard', 'short', 'all']),
      }),
    )
    .min(1)
    .max(8),
  reason: z.string().describe('explanation for channel owner, Markdown'),
});

export const ReportSchema = z.object({
  report: z.string().describe('performance report in Markdown'),
});

/** Memorization illustrator: choose backgrounds & moods matching each verse meaning. */
export const IllustratorSchema = z.object({
  visuals: z.array(
    z.object({
      number: z.number().describe('verse number (0 = basmalah)'),
      background: z.enum(BACKGROUNDS),
      moods: z.array(z.enum(MOODS)).max(2),
    }),
  ),
});
