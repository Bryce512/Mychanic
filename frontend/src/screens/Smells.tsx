import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import theme from '../styles/StylizedComponents';
import DiagButton from '../components/DiagButton';

interface Props {
  theme: any;
  Stack: any;
  navigation: any;
  goToScreen: (routeName: string) => void;
}

const Smells: React.FC<Props> = () => {
  const navigation = useNavigation();
  const goToScreen = (routeName: string) => {
    navigation.navigate(routeName);
  };

  return (
    <View style={theme.homeView}>
      <View style={theme.clickButtonContainer}>
        <ScrollView>
          <DiagButton
            text="Muggy smell from AC"
            onPress={() => goToScreen('settings')}
          />
          <DiagButton
            text="Rotten eggs"
            onPress={() => goToScreen('settings')}
          />
          <DiagButton
            text="Burning Rubber"
            onPress={() => goToScreen('settings')}
          />
          <DiagButton
            text="Burning Metal"
            onPress={() => goToScreen('settings')}
          />
        </ScrollView>
      </View>
    </View>
  );
};

export default Smells;
