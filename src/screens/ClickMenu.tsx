import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {TouchableOpacity} from 'react-native-gesture-handler';
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
      <View style={style.libButtonCont}>
        <TouchableOpacity
          style={style.dashLibraryButton}
          onPress={() => goToScreen('DashLib')}>
          <Text style={style.dashLibraryButtonText}>Dashlight Library</Text>
        </TouchableOpacity>
      </View>

      <View style={style.menuButtonContainer}>
        <DiagButton
          text="Making Sounds"
          onPress={() => goToScreen('SoundScreen')}
        />
        <DiagButton
          text="Feels Wrong"
          onPress={() => goToScreen('FeelScreen')}
        />
        <DiagButton
          text="Not Working Right"
          onPress={() => goToScreen('NotWorking')}
        />
        <DiagButton text="Looks Wrong" onPress={() => goToScreen('Looks')} />
        <DiagButton text="Smells Wrong" onPress={() => goToScreen('Smells')} />
      </View>
    </View>
  );
};

export default ClickScreen;

const style = StyleSheet.create({
  libButtonCont: {
    position: 'relative',
    alignSelf: 'center',
  },
  dashLibraryButton: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5D8A8D',
    borderRadius: 20,
    width: 340,
    height: 59,
    marginBottom: '10%',
    marginTop: '10%',
    shadowColor: 'black',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  dashLibraryButtonText: {
    color: 'white',
    fontSize: 27,
    fontWeight: '300',
  },
  menuButtonContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: '5%',
  },
});
