import React from 'react';

// import all the components we are going to use
import {
  SafeAreaView,
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';

interface Props {}

const SettingsButton: React.FC<Props> = () => {
  const navigation = useNavigation();
  const routeName = 'settings';

  const clickHandler = () => {
    //function to handle click on Settings Action Button
    // @ts-expect-error: Let's ignore a compile error like this unreachable code
    navigation.navigate(routeName);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        {/* <Text style={styles.titleStyle}>
          Example of React Native Settings Action Button
        </Text>
        <Text style={styles.textStyle}>
          Click on Action Button to see Alert */}
        {/* </Text> */}
        <View style={styles.overlay}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={clickHandler}
            style={styles.touchableOpacityStyle}>
            <Image
              //We are making FAB using TouchableOpacity with an image
              //We are using online image here
              source={{
                uri: 'https://raw.githubusercontent.com/AboutReact/sampleresource/master/plus_icon.png',
              }}
              //You can use you project image Example below
              //source={require('./images/float-add-icon.png')}
              style={styles.SettingsButtonStyle}
            />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={clickHandler}
            style={styles.touchableOpacityStyle}>
            <Image
              //We are making FAB using TouchableOpacity with an image
              //We are using online image here
              source={{
                uri: 'https://raw.githubusercontent.com/AboutReact/sampleresource/master/plus_icon.png',
              }}
              //You can use you project image Example below
              //source={require('./images/float-add-icon.png')}
              style={styles.SettingsButtonStyle}
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default SettingsButton;

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    display: 'flex',
    backgroundColor: 'white',
    width: '100%',
    height: '100%',
    // padding: 10,
  },
  overlay: {
    position: 'relative',
    display: 'flex',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    // flexWrap: 'wrap',
    flexDirection: 'column',
  },

  titleStyle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 10,
  },
  textStyle: {
    fontSize: 16,
    textAlign: 'center',
    padding: 10,
  },
  touchableOpacityStyle: {
    position: 'relative',
    width: 50,
    height: 50,
    marginRight: 20,
    marginBottom: 20,
  },
  SettingsButtonStyle: {
    resizeMode: 'contain',
    width: 50,
    height: 50,
    // backgroundColor:'black'
  },
});
