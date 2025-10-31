/**
 * Sound utilities for playing notification sounds
 * Uses Web Audio API to generate pleasant notification sounds
 */

/**
 * Plays a pleasant success sound (two-tone ascending chime)
 * Duration: ~0.5 seconds
 */
export const playSuccessSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // First tone (higher frequency)
    const oscillator1 = audioContext.createOscillator();
    const gainNode1 = audioContext.createGain();
    
    oscillator1.connect(gainNode1);
    gainNode1.connect(audioContext.destination);
    
    oscillator1.frequency.value = 800; // Higher pitch
    oscillator1.type = 'sine';
    
    gainNode1.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode1.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
    gainNode1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
    
    oscillator1.start(audioContext.currentTime);
    oscillator1.stop(audioContext.currentTime + 0.25);
    
    // Second tone (even higher frequency) - plays slightly after first
    const oscillator2 = audioContext.createOscillator();
    const gainNode2 = audioContext.createGain();
    
    oscillator2.connect(gainNode2);
    gainNode2.connect(audioContext.destination);
    
    oscillator2.frequency.value = 1000; // Even higher pitch
    oscillator2.type = 'sine';
    
    gainNode2.gain.setValueAtTime(0, audioContext.currentTime + 0.15);
    gainNode2.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.16);
    gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator2.start(audioContext.currentTime + 0.15);
    oscillator2.stop(audioContext.currentTime + 0.5);
    
  } catch (error) {
    // Silently fail if audio context is not available or autoplay is blocked
    console.debug('Could not play success sound:', error);
  }
};
