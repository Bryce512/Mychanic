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

const NotWorking: React.FC<Props> = () => {
  const navigation = useNavigation();
  const goToScreen = (routeName: string) => {
    navigation.navigate(routeName);
  };

  return (
    <View style={theme.homeView}>
      <View style={theme.clickButtonContainer}>
        <ScrollView>
          <DiagButton
            text="I can shift but the vehicle doesn’t move"
            onPress={() => goToScreen('settings')}
          />
          <DiagButton
            text="I turn off the car but the engine keeps running"
            onPress={() => goToScreen('settings')}
          />
          <DiagButton
            text="Lack of hot/cold air"
            onPress={() => goToScreen('settings')}
          />
          <DiagButton
            text="Car won’t start"
            onPress={() => goToScreen('settings')}
          />
          <DiagButton
            text="Poor gas mileage"
            onPress={() => goToScreen('settings')}
          />
          <DiagButton
            text="Engine stalls"
            onPress={() => goToScreen('settings')}
          />
          <DiagButton
            text="Won’t shift into park"
            onPress={() => goToScreen('settings')}
          />
          <DiagButton
            text="Can't shift out of park"
            onPress={() => goToScreen('settings')}
          />
        </ScrollView>
      </View>
    </View>
  );
};

export default NotWorking;
