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

const LooksLike: React.FC<Props> = () => {
  const navigation = useNavigation();
  const goToScreen = (routeName: string) => {
    navigation.navigate(routeName);
  };

  return (
    <View style={theme.homeView}>
      <View style={theme.clickButtonContainer}>
        <ScrollView>
          <DiagButton text="Smoke" onPress={() => goToScreen('settings')} />
          <DiagButton text="Steam" onPress={() => goToScreen('settings')} />
          <DiagButton
            text="Tire Wearing Out"
            onPress={() => goToScreen('settings')}
          />
          <DiagButton
            text="High Engine Temp"
            onPress={() => goToScreen('settings')}
          />
          <DiagButton
            text="Poor Gas Mileage"
            onPress={() => goToScreen('settings')}
          />
          s
          <DiagButton
            text="Warning Light On"
            onPress={() => goToScreen('DashLib')}
          />
        </ScrollView>
      </View>
    </View>
  );
};

export default LooksLike;
