import type { EpisodeVideoProps, ThumbnailProps } from '@kantor/shared/types';

// Data contoh untuk pratinjau di Remotion Studio (npm run studio).
export const sampleEpisode: EpisodeVideoProps = {
  channelName: 'Tasnie Office',
  seriesName: 'Doa Harian Mamas',
  title: 'Bismillah Sebelum Makan',
  scenes: [
    {
      type: 'story',
      speaker: 'narrator',
      narration: "Assalamu'alaikum, adik-adik! Sore ini Mamas baru pulang bermain. Perutnya keroncongan.",
      background: 'living-room',
      characters: ['mother', 'mamas', 'mochi'],
      expression: 'happy',
    },
    {
      type: 'story',
      speaker: 'mamas',
      narration: 'Wah, ada pisang dan jeruk! Mamas mau makan sekarang!',
      background: 'kitchen',
      characters: ['mamas', 'mochi'],
      expression: 'surprised',
    },
    {
      type: 'story',
      speaker: 'mother',
      narration: 'Eits, tunggu dulu, Mas. Sebelum makan, kita baca apa hayo?',
      background: 'kitchen',
      characters: ['mother', 'mamas'],
      expression: 'thinking',
    },
    {
      type: 'question',
      speaker: 'narrator',
      narration: 'Menurut adik-adik, apa yang kita baca sebelum makan?',
      background: 'kitchen',
      characters: ['mamas'],
      expression: 'thinking',
      screenText: 'Baca apa ya?',
    },
    {
      type: 'prayer',
      speaker: 'narrator',
      narration: 'Betul! Kita membaca doa. Bismillah. Allahumma barik lana fima razaqtana wa qina adzaban nar.',
      background: 'kitchen',
      characters: [],
      expression: 'calm',
      screenText: 'Doa Sebelum Makan',
      prayer: {
        arabic: 'اللَّهُمَّ بَارِكْ لَنَا فِيمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ',
        latin: "Allahumma barik lana fima razaqtana wa qina 'adzaban nar",
        meaning: 'Ya Allah, berkahilah rezeki yang Engkau berikan kepada kami dan peliharalah kami dari siksa neraka',
      },
    },
    {
      type: 'story',
      speaker: 'mamas',
      narration: 'Bismillah! Hmm, pisangnya jadi tambah enak, Bu!',
      background: 'kitchen',
      characters: ['mother', 'mamas', 'mochi'],
      expression: 'happy',
      screenText: 'Bismillah dulu, ya!',
    },
  ],
};

// Contoh Shorts: cerita yang sama dipadatkan jadi < 60 detik.
export const sampleShort: EpisodeVideoProps = {
  channelName: 'Tasnie Office',
  seriesName: '',
  title: 'Bismillah Dulu!',
  format: 'short',
  scenes: [
    {
      type: 'story',
      speaker: 'mamas',
      narration: 'Wah, ada pisang! Mamas mau makan sekarang!',
      background: 'kitchen',
      characters: ['mother', 'mamas'],
      expression: 'surprised',
    },
    {
      type: 'story',
      speaker: 'mother',
      narration: 'Eits, tunggu dulu, Mas. Baca apa dulu, hayo?',
      background: 'kitchen',
      characters: ['mother', 'mamas'],
      expression: 'thinking',
    },
    {
      type: 'prayer',
      speaker: 'narrator',
      narration: 'Bismillah. Allahumma barik lana fima razaqtana wa qina adzaban nar.',
      background: 'kitchen',
      characters: [],
      expression: 'calm',
      screenText: 'Doa Sebelum Makan',
      prayer: sampleEpisode.scenes[4].prayer,
    },
    {
      type: 'story',
      speaker: 'mamas',
      narration: 'Bismillah! Pisangnya jadi tambah enak, Bu!',
      background: 'kitchen',
      characters: ['mother', 'mamas', 'mochi'],
      expression: 'happy',
      screenText: 'Bismillah dulu, ya!',
    },
  ],
};

// Contoh memorization: Surat Al-Ikhlas (text dari equran.id / Kemenag RI), tiap ayat 3x.
export const sampleMemorization: EpisodeVideoProps = {
  channelName: 'Tasnie Office',
  seriesName: 'Hafalan Surat',
  title: 'Hafalan Surat Al-Ikhlas',
  scenes: [],
  memorization: {
    surahName: 'Al-Ikhlas',
    surahMeaning: 'Ikhlas',
    repetitions: 3,
    verses: [
      {
        number: 0,
        arabic: 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ',
        latin: 'Bismillāhir-raḥmānir-raḥīm(i).',
        meaning: 'Dengan nama Allah Yang Maha Pengasih lagi Maha Penyayang.',
        background: 'night-sky',
        moods: ['light'],
      },
      {
        number: 1,
        arabic: 'قُلْ هُوَ اللّٰهُ اَحَدٌۚ',
        latin: 'Qul huwallāhu aḥad(un).',
        meaning: 'Katakanlah (Nabi Muhammad), “Dialah Allah Yang Maha Esa.',
        background: 'night-sky',
        moods: ['stars'],
      },
      {
        number: 2,
        arabic: 'اَللّٰهُ الصَّمَدُۚ',
        latin: 'Allāhuṣ-ṣamad(u).',
        meaning: 'Allah tempat meminta segala sesuatu.',
        background: 'dawn',
        moods: [],
      },
      {
        number: 3,
        arabic: 'لَمْ يَلِدْ وَلَمْ يُوْلَدْۙ',
        latin: 'Lam yalid wa lam yūlad.',
        meaning: 'Dia tidak beranak dan tidak pula diperanakkan',
        background: 'dawn',
        moods: ['light'],
      },
      {
        number: 4,
        arabic: 'وَلَمْ يَكُنْ لَّهٗ كُفُوًا اَحَدٌ ࣖ',
        latin: 'Wa lam yakul lahū kufuwan aḥad(un).',
        meaning: 'serta tidak ada sesuatu pun yang setara dengan-Nya.”',
        background: 'mountain',
        moods: ['birds'],
      },
    ],
  },
};

export const sampleThumbnail: ThumbnailProps = {
  text: 'Bismillah Dulu, Ya!',
  background: 'kitchen',
  characters: ['mother', 'mamas'],
  expression: 'happy',
};
