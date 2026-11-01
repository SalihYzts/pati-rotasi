// Yürüyüş müziği: profilde açılınca döngüde çalar.
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useEffect } from 'react';

import { useApp } from '@/store/AppStore';

export default function MusicPlayer() {
  const { state } = useApp();
  const player = useAudioPlayer(require('../../assets/audio/walk.mp3'));

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true }).catch(() => {});
  }, []);

  useEffect(() => {
    player.loop = true;
    player.volume = 0.55;
    if (state.musicOn) player.play();
    else player.pause();
  }, [state.musicOn, player]);

  return null;
}
