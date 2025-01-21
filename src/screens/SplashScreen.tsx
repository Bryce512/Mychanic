import React from 'react';
import {View, Text} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StyleSheet} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';



const SplashScreen: React.FC = () => {
  // Type the navigation hook for correct type inference
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const goToHome = () => {
    navigation.navigate('Home'); // Navigate to the Home screen
  };

  return (
    <View style={styles.splashView}>
      <TouchableOpacity style={styles.buttonPlace} onPress={goToHome}>
        <Text style={styles.buttonText}>Mychanic</Text>
      </TouchableOpacity>
    </View>
  );
};

const darkbackgroundColor = '#5D8A8D';

const styles = StyleSheet.create({
  buttonPlace: {
    marginBottom: 150,
  },
  buttonText: {
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 48,
    paddingVertical: 150,
    fontWeight: '200',
  },
  splashView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: darkbackgroundColor,
  },
  splashText: {
    color: '#FFFFFF',
    fontSize: 48,
    marginVertical: 275,
    fontWeight: '200',
  },
});

export default SplashScreen;
