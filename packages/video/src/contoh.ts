import type { EpisodeVideoProps, ThumbnailProps } from '@kantor/shared/types';

// Data contoh untuk pratinjau di Remotion Studio (npm run studio).
export const contohEpisode: EpisodeVideoProps = {
  namaChannel: 'Tasnie Office',
  namaSeri: 'Doa Harian Mamas',
  judul: 'Bismillah Sebelum Makan',
  adegan: [
    {
      jenis: 'cerita',
      pembicara: 'narator',
      narasi: "Assalamu'alaikum, adik-adik! Sore ini Mamas baru pulang bermain. Perutnya keroncongan.",
      latar: 'ruang-tamu',
      karakter: ['ibu', 'mamas', 'mochi'],
      ekspresi: 'senang',
    },
    {
      jenis: 'cerita',
      pembicara: 'mamas',
      narasi: 'Wah, ada pisang dan jeruk! Mamas mau makan sekarang!',
      latar: 'dapur',
      karakter: ['mamas', 'mochi'],
      ekspresi: 'kaget',
    },
    {
      jenis: 'cerita',
      pembicara: 'ibu',
      narasi: 'Eits, tunggu dulu, Mas. Sebelum makan, kita baca apa hayo?',
      latar: 'dapur',
      karakter: ['ibu', 'mamas'],
      ekspresi: 'berpikir',
    },
    {
      jenis: 'pertanyaan',
      pembicara: 'narator',
      narasi: 'Menurut adik-adik, apa yang kita baca sebelum makan?',
      latar: 'dapur',
      karakter: ['mamas'],
      ekspresi: 'berpikir',
      teksLayar: 'Baca apa ya?',
    },
    {
      jenis: 'doa',
      pembicara: 'narator',
      narasi: 'Betul! Kita membaca doa. Bismillah. Allahumma barik lana fima razaqtana wa qina adzaban nar.',
      latar: 'dapur',
      karakter: [],
      ekspresi: 'tenang',
      teksLayar: 'Doa Sebelum Makan',
      doa: {
        arab: 'اللَّهُمَّ بَارِكْ لَنَا فِيمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ',
        latin: "Allahumma barik lana fima razaqtana wa qina 'adzaban nar",
        arti: 'Ya Allah, berkahilah rezeki yang Engkau berikan kepada kami dan peliharalah kami dari siksa neraka',
      },
    },
    {
      jenis: 'cerita',
      pembicara: 'mamas',
      narasi: 'Bismillah! Hmm, pisangnya jadi tambah enak, Bu!',
      latar: 'dapur',
      karakter: ['ibu', 'mamas', 'mochi'],
      ekspresi: 'senang',
      teksLayar: 'Bismillah dulu, ya!',
    },
  ],
};

// Contoh Shorts: cerita yang sama dipadatkan jadi < 60 detik.
export const contohShort: EpisodeVideoProps = {
  namaChannel: 'Tasnie Office',
  namaSeri: '',
  judul: 'Bismillah Dulu!',
  format: 'short',
  adegan: [
    {
      jenis: 'cerita',
      pembicara: 'mamas',
      narasi: 'Wah, ada pisang! Mamas mau makan sekarang!',
      latar: 'dapur',
      karakter: ['ibu', 'mamas'],
      ekspresi: 'kaget',
    },
    {
      jenis: 'cerita',
      pembicara: 'ibu',
      narasi: 'Eits, tunggu dulu, Mas. Baca apa dulu, hayo?',
      latar: 'dapur',
      karakter: ['ibu', 'mamas'],
      ekspresi: 'berpikir',
    },
    {
      jenis: 'doa',
      pembicara: 'narator',
      narasi: 'Bismillah. Allahumma barik lana fima razaqtana wa qina adzaban nar.',
      latar: 'dapur',
      karakter: [],
      ekspresi: 'tenang',
      teksLayar: 'Doa Sebelum Makan',
      doa: contohEpisode.adegan[4].doa,
    },
    {
      jenis: 'cerita',
      pembicara: 'mamas',
      narasi: 'Bismillah! Pisangnya jadi tambah enak, Bu!',
      latar: 'dapur',
      karakter: ['ibu', 'mamas', 'mochi'],
      ekspresi: 'senang',
      teksLayar: 'Bismillah dulu, ya!',
    },
  ],
};

// Contoh hafalan: Surat Al-Ikhlas (teks dari equran.id / Kemenag RI), tiap ayat 3x.
export const contohHafalan: EpisodeVideoProps = {
  namaChannel: 'Tasnie Office',
  namaSeri: 'Hafalan Surat',
  judul: 'Hafalan Surat Al-Ikhlas',
  adegan: [],
  hafalan: {
    namaSurat: 'Al-Ikhlas',
    artiSurat: 'Ikhlas',
    ulang: 3,
    ayat: [
      {
        nomor: 0,
        arab: 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ',
        latin: 'Bismillāhir-raḥmānir-raḥīm(i).',
        arti: 'Dengan nama Allah Yang Maha Pengasih lagi Maha Penyayang.',
        latar: 'langit-malam',
        suasana: ['cahaya'],
      },
      {
        nomor: 1,
        arab: 'قُلْ هُوَ اللّٰهُ اَحَدٌۚ',
        latin: 'Qul huwallāhu aḥad(un).',
        arti: 'Katakanlah (Nabi Muhammad), “Dialah Allah Yang Maha Esa.',
        latar: 'langit-malam',
        suasana: ['bintang'],
      },
      {
        nomor: 2,
        arab: 'اَللّٰهُ الصَّمَدُۚ',
        latin: 'Allāhuṣ-ṣamad(u).',
        arti: 'Allah tempat meminta segala sesuatu.',
        latar: 'fajar',
        suasana: [],
      },
      {
        nomor: 3,
        arab: 'لَمْ يَلِدْ وَلَمْ يُوْلَدْۙ',
        latin: 'Lam yalid wa lam yūlad.',
        arti: 'Dia tidak beranak dan tidak pula diperanakkan',
        latar: 'fajar',
        suasana: ['cahaya'],
      },
      {
        nomor: 4,
        arab: 'وَلَمْ يَكُنْ لَّهٗ كُفُوًا اَحَدٌ ࣖ',
        latin: 'Wa lam yakul lahū kufuwan aḥad(un).',
        arti: 'serta tidak ada sesuatu pun yang setara dengan-Nya.”',
        latar: 'gunung',
        suasana: ['burung'],
      },
    ],
  },
};

export const contohThumbnail: ThumbnailProps = {
  teks: 'Bismillah Dulu, Ya!',
  latar: 'dapur',
  karakter: ['ibu', 'mamas'],
  ekspresi: 'senang',
};
