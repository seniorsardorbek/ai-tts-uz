import { Router } from 'express';
import multer from 'multer';
import { gradeText, gradeVoice } from '../lib/grading.js';

// Grading languages are independent of the TTS voice contract (options.js is
// gender-only now), so keep this self-contained.
const GRADE_LANGS = ['uz', 'ru'];
const DEFAULT_LANG = 'uz';
const isValidLang = (l) => GRADE_LANGS.includes(l);

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const MIN_ANSWER_LEN = 3;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_BYTES },
});

const router = Router();

// Single endpoint, two modes:
//   - application/json      -> text mode  (answerText)
//   - multipart/form-data   -> voice mode (audio file, transcribed + graded)
// Returns { correct, feedback, transcript? }. Errors are JSON { error }.
router.post('/', (req, res) => {
  upload.single('audio')(req, res, async (uploadErr) => {
    try {
      if (uploadErr) {
        if (uploadErr.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'audio file too large (max 25MB)' });
        }
        return res.status(400).json({ error: 'invalid upload' });
      }

      const body = req.body || {};
      const question = typeof body.question === 'string' ? body.question.trim() : '';
      const rubric = typeof body.rubric === 'string' ? body.rubric.trim() : '';
      const lang = isValidLang(body.lang) ? body.lang : DEFAULT_LANG;
      const mode = req.file ? 'voice' : 'text';
      const lessonId = body.lessonId ?? '-';
      const screenIdx = body.screenIdx ?? '-';

      if (!question) return res.status(400).json({ error: 'question is required' });
      if (!rubric) return res.status(400).json({ error: 'rubric is required' });

      console.log(`[grade] lesson=${lessonId} screen=${screenIdx} mode=${mode} lang=${lang}`);

      let result;
      if (mode === 'voice') {
        if (!req.file || !req.file.buffer?.length) {
          return res.status(400).json({ error: 'audio file is required' });
        }
        result = await gradeVoice({
          question,
          rubric,
          lang,
          audioBuffer: req.file.buffer,
          mimeType: req.file.mimetype,
        });
      } else {
        const answerText = typeof body.answerText === 'string' ? body.answerText.trim() : '';
        if (answerText.length < MIN_ANSWER_LEN) {
          return res.status(400).json({ error: 'answer too short' });
        }
        result = await gradeText({ question, rubric, lang, answerText });
      }

      return res.json(result);
    } catch (err) {
      console.error('[grade] error:', err.message || err);
      return res.status(500).json({ error: 'grading failed' });
    }
  });
});

export default router;
