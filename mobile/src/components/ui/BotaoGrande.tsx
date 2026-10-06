import React from 'react'; 
import { TouchableOpacity, Text } from 'react-native'; 
 
export function BotaoGrande(props) { 
  return React.createElement( 
    TouchableOpacity, 
    { onPress: props.onPress }, 
    React.createElement(Text, null, props.texto) 
  ); 
} 
