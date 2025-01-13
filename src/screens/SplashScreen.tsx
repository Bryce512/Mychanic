import React from 'react';
import {View, Text} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StyleSheet} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';

interface Props {
  theme: any;
}

const SplashScreen: React.FC<Props> = ({theme}) => {
  const navigation = useNavigation();
  const routeName = 'Home'; // Replace with your desired route name

  const goToScreen = () => {
    navigation.navigate(routeName);
  };

  return (
    <View style={style.splashView}>
      <TouchableOpacity style={style.buttonPlace} onPress={goToScreen}>
        <Text style={style.buttonText}>Mychanic</Text>
      </TouchableOpacity>
    </View>
  );
};

const darkbackgroundColor = '#5D8A8D';

const style = StyleSheet.create({
  buttonPlace: {
    marginBottom: 150,
  },
  buttonText: {
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 48,
    paddingVertical: 150,
    fontWeight: 200,
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
    fontWeight: 200,
  },
});

export default SplashScreen;
