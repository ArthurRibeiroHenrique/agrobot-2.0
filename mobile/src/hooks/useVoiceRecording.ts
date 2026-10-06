import { useState } from 'react'; 
import { Audio } from 'expo-av'; 
 
export function useVoiceRecording() { 
  const [gravando, setGravando] = useState(false); 
 
  async function iniciar() { 
    await Audio.requestPermissionsAsync(); 
    const recording = new Audio.Recording(); 
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY); 
    await recording.startAsync(); 
    setGravando(true); 
    return recording; 
  } 
 
  async function parar(recording) { 
    if (recording == null) return null; 
    await recording.stopAndUnloadAsync(); 
    setGravando(false); 
    return recording.getURI(); 
  } 
 
  return { gravando, iniciar, parar }; 
} 
