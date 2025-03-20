import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import theme from '../styles/StylizedComponents';
import DiagButton from '../components/DiagButton';
import { navigate } from '../services/navigationServices';

interface Props {
  theme: any;
  Stack: any;
  navigation: any;
  goToScreen: (routeName: string) => void;
}

const ClickScreen: React.FC<Props> = () => {


  return (
    <View style={theme.homeView}>
      <View style={style.libButtonCont}>
        <TouchableOpacity
          style={style.dashLibraryButton}
          onPress={() => navigate("DashLib")}>
          <Text style={style.dashLibraryButtonText}>Dashlight Library</Text>
        </TouchableOpacity>
      </View>

      <View style={style.menuButtonContainer}>
        <DiagButton
          text="Making Sounds"
          onPress={() => navigate("SoundScreen")}
        />
        <DiagButton
          text="Feels Wrong"
          onPress={() => navigate("FeelScreen")}
        />
        <DiagButton
          text="Not Working Right"
          onPress={() => navigate("NotWorking")}
        />
        <DiagButton text="Looks Wrong" onPress={() => navigate("Looks")} />
        <DiagButton text="Smells Wrong" onPress={() => navigate("Smells")} />
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
