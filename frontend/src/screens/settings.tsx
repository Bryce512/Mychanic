import React from 'react';
import {View, Text} from 'react-native';

interface Props {
  theme: any;
  Stack: any;
  navigation: any;
}

const Settings: React.FC<Props> = ({theme, Stack}) => {
  return (
    <View style={theme.homeView}>
      <Text>Settings text</Text>
    </View>
  );
};

export default Settings;
