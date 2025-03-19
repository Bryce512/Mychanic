import React from 'react';
import {View, Text} from 'react-native';
import theme from '../styles/StylizedComponents';

interface Props {
  theme: any;
  Stack: any;
  navigation: any;
}

const SettingScreen: React.FC<Props> = ({theme, Stack}) => {
  return (
    <View style={theme.homeView}>
      <Text>blank text</Text>
    </View>
  );
};

export default SettingScreen;
