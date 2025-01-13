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
      <Text style={theme.menuText}>Car makes sounds when...</Text>
      <View style={theme.clickButtonContainer}>
        <ScrollView>
          <DiagButton
            text="Starting the engine"
            onPress={() => goToScreen('settings')}
          />
          <DiagButton text="Braking" onPress={() => goToScreen('settings')} />
          <DiagButton text="Turning" onPress={() => goToScreen('settings')} />
          <DiagButton
            text="Turning on the A/C"
            onPress={() => goToScreen('settings')}
          />
          <DiagButton
            text="At High Speeds"
            onPress={() => goToScreen('settings')}
          />
        </ScrollView>
      </View>
    </View>
  );
};

export default ClickScreen;
const style = StyleSheet.create({
  buttoncontainer: {
    position: 'relative',
    alignItems: 'center',
    marginTop: '-20%',
  },
});
