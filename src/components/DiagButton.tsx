import React from 'react';
import {TouchableOpacity, Text, StyleSheet} from 'react-native';
import theme from '../styles/StylizedComponents';

const DiagButton = ({text, onPress}) => {
  return (
    <TouchableOpacity style={theme.menuButton} onPress={onPress}>
      <Text style={styles.buttonText}>{text}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonText: {
    color: 'white',
    fontSize: 27,
    fontWeight: '300',
  },
});

export default DiagButton;
