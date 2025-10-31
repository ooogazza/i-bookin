import confirmationSound from '@/assets/confirmation-sound.wav';

/**
 * Sound utilities for playing notification sounds
 */

/**
 * Plays a confirmation sound from audio file
 */
export const playSuccessSound = () => {
  try {
    const audio = new Audio(confirmationSound);
    audio.volume = 0.5;
    audio.play().catch(error => {
      // Silently fail if autoplay is blocked
      console.debug('Could not play success sound:', error);
    });
  } catch (error) {
    // Silently fail if audio is not available
    console.debug('Could not play success sound:', error);
  }
};
