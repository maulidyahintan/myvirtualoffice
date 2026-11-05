import React from 'react';
import { Composition, Still } from 'remotion';
import { FPS } from '@kantor/shared/constants';
import { Episode, calculateEpisodeMetadata } from './Episode';
import { Thumbnail } from './Thumbnail';
import { PROTOTYPE_3D_DURATION, Prototype3D } from './Prototype3D';
import { Avatar, Banner, IkonStill, LogoStill } from './brand/Branding';
import { LogoAnimasi } from './brand/LogoAnimasi';
import { withLooks } from './characters/looks';
import { sampleEpisode, sampleMemorization, sampleShort, sampleThumbnail } from './samples';

// characters use the colors from the props' characterLooks (Settings → Karakter)
const EpisodeDenganWarna = withLooks(Episode);
const ThumbnailDenganWarna = withLooks(Thumbnail);

export const Root: React.FC = () => (
  <>
    <Composition
      id="Episode"
      component={EpisodeDenganWarna}
      width={1920}
      height={1080}
      fps={FPS}
      durationInFrames={300}
      defaultProps={sampleEpisode}
      calculateMetadata={calculateEpisodeMetadata}
    />
    {/* pratinjau YouTube Shorts (komposisi yang sama, ukuran mengikuti props.format) */}
    <Composition
      id="Short"
      component={EpisodeDenganWarna}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={300}
      defaultProps={sampleShort}
      calculateMetadata={calculateEpisodeMetadata}
    />
    <Composition
      id="Hafalan"
      component={EpisodeDenganWarna}
      width={1920}
      height={1080}
      fps={FPS}
      durationInFrames={300}
      defaultProps={sampleMemorization}
      calculateMetadata={calculateEpisodeMetadata}
    />
    {/* prototipe tokoh 3D */}
    <Composition id="Prototipe3D" component={Prototype3D} width={1920} height={1080} fps={FPS} durationInFrames={PROTOTYPE_3D_DURATION} />
    <Still id="Thumbnail" component={ThumbnailDenganWarna} width={1280} height={720} defaultProps={sampleThumbnail} />
    {/* branding channel */}
    <Composition id="LogoAnimasi" component={LogoAnimasi} width={1920} height={1080} fps={FPS} durationInFrames={FPS * 3} />
    <Still id="Logo" component={LogoStill} width={1600} height={600} />
    <Still id="LogoIkon" component={IkonStill} width={1000} height={1000} />
    <Still id="Avatar" component={Avatar} width={800} height={800} />
    <Still id="Banner" component={Banner} width={2560} height={1440} />
  </>
);
