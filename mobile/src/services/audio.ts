import { Audio } from 'expo-av'; 
 
export async function pedirPermissaoDeAudio() { 
  const permissao = await Audio.requestPermissionsAsync(); 
  return permissao.granted; 
} 
 
export async function criarGravacao() { 
  const recording = new Audio.Recording(); 
  await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY); 
  return recording; 
} 
