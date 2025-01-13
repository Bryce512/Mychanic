import React from 'react';
import {View, Text} from 'react-native';

interface Props {
  theme: any;
  Stack: any;
  navigation: any;
}

const DataScreen: React.FC<Props> = ({theme, Stack}) => {
  return (
    <View style={theme.homeView}>
      <Text>Data Screen</Text>
    </View>
  );
};

export default DataScreen;
