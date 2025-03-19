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

const ClickScreen: React.FC<Props> = () => {
  const navigation = useNavigation();
  const goToScreen = (routeName: string) => {
    navigation.navigate(routeName);
  };

  return (
    <View style={theme.homeView}>
      <View style={theme.clickButtonContainer}>
        <ScrollView>
          <DiagButton
            text="Braking Weird"
            onPress={() => goToScreen('settings')}
          />
          <DiagButton
            text="Steering Weird"
            onPress={() => goToScreen('settings')}
          />
          <DiagButton
            text="Shifting Weird"
            onPress={() => goToScreen('settings')}
          />
          <DiagButton text="Shaking" onPress={() => goToScreen('settings')} />
          <DiagButton
            text="Feels sluggish"
            onPress={() => goToScreen('settings')}
          />
          <DiagButton
            text="Rides uncomfortably"
            onPress={() => goToScreen('settings')}
          />
        </ScrollView>
      </View>
    </View>
  );
};

export default ClickScreen;
