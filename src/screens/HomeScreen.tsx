import React, {useState} from 'react';
import {View, Text, StyleSheet, Image, ScrollView, Alert} from 'react-native';
import AllIcons from '../assets/icons/Imported_Icons';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {useNavigation} from '@react-navigation/native';
import Progress_bar from '../components/ProgressBar';
import theme from '../styles/StylizedComponents';
import { RootStackParamList } from '../../App';


interface Props {
  theme: any;
  Stack: any;
  navigation: any;
  goToScreen: (routeName: string) => void;
  onDelete: () => void;
}

const CustomHeader: React.FC<Props> = ({goToScreen}) => (
  <View style={theme.headerContainer}>
    <View style={theme.headerBackground} />
    <Text style={theme.headerText}>My Garage</Text>
    <View style={theme.settingsButtonContainer}>
      <TouchableOpacity onPress={() => goToScreen('Settings')}>
        <AllIcons.MatComIcons name="cog" size={30} style={theme.settingsIcon} />
      </TouchableOpacity>
    </View>
  </View>
);

const TabBar: React.FC<Props> = ({goToScreen}) => (
  <View style={theme.tabContainer}>
    <View style={theme.tabBackground} />

    <View style={theme.tabButton}>
      <TouchableOpacity onPress={() => goToScreen('ClickMenu')}>
        <AllIcons.MatComIcons
          name="car-wrench"
          size={55}
          style={theme.settingsIcon}
        />
        <Text style={theme.tabText}>Issue?</Text>
      </TouchableOpacity>
    </View>

    <View style={theme.tabButton}>
      <TouchableOpacity onPress={() => goToScreen('ClickMenu')}>
        <AllIcons.MatComIcons
          name="account-wrench"
          size={55}
          style={theme.settingsIcon}
        />
        <Text style={theme.tabText}>Connect</Text>
      </TouchableOpacity>
    </View>

    <View style={theme.tabButton}>
      <TouchableOpacity onPress={() => goToScreen('ScanDevices')}>
        <AllIcons.Oct_Icons name="graph" size={45} style={theme.settingsIcon} />

        <Text style={theme.tabText}>Live Data</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const ImageWithColorBox: React.FC<Props> = ({onDelete}) => {
  const mileageSinceLastOilChange = 3800; // Replace this with your actual value
  const mileageSinceLastRotation = 3000; // Replace this with your actual value

  const getOilChangeProgress = () => {
    const maxMileageForOilChange = 5000;
    const health =
      100 - (mileageSinceLastOilChange / maxMileageForOilChange) * 100;
    return Math.min(health, 100);
  };

  const getTireRotationProgress = () => {
    const maxMileageForRotation = 8000;
    const health =
      100 - (mileageSinceLastRotation / maxMileageForRotation) * 100;
    return Math.min(health, 100);
  };

  const backgroundBarWidth = '60%'; // Adjust this as needed
  const progressBarHeight = '20%'; // Adjust this as needed
  const borderRadius = 10;

  return (
    <TouchableOpacity onLongPress={onDelete}>
      <View style={style.CarShadowContainer}>
        <View style={style.imageWithColorBoxContainer}>
          <View style={style.imageContainer}>
            <Image
              source={require('../assets/images/IMG_2037.jpeg')}
              style={style.image}
            />
          </View>
          <View style={style.colorBox}>
            <AllIcons.FA5 name="oil-can" size={40} />
            <Progress_bar
              progress={getOilChangeProgress()}
              height={progressBarHeight}
            />
            <AllIcons.MatComIcons name="tire" size={40} />
            <Progress_bar
              progress={getTireRotationProgress()}
              height={progressBarHeight}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

//***** MAIN SCREEN ******//
const HomeScreen: React.FC<Props> = () => {
  const navigation = useNavigation();
  const goToScreen = (routeName: string) => {
    navigation.navigate(routeName);
  };

  const [imageBoxes, setImageBoxes] = useState<{key: string}[]>([]);

  const addImageBox = () => {
    // Create a new unique key for each image box
    const newKey = Math.random().toString(36).substring(7);
    setImageBoxes((prevImageBoxes: any) => [...prevImageBoxes, {key: newKey}]);
  };

  const handleDeleteImageBox = (boxKey: string) => {
    Alert.alert(
      'Delete Vehicle?',
      'Are you sure you want to delete this vehicle?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteImageBox(boxKey),
        },
      ],
      {cancelable: true},
    );
  };

  const deleteImageBox = (boxKey: string) => {
    setImageBoxes((prevImageBoxes: any) =>
      prevImageBoxes.filter((item: {key: string}) => item.key !== boxKey),
    );
  };

  return (
    <View style={theme.homeView}>
      <ScrollView style={theme.scrollContainer}>
        <ImageWithColorBox
          onDelete={() => handleDeleteImageBox('default')}
          theme={undefined}
          Stack={undefined}
          navigation={undefined}
          goToScreen={function (routeName: string): void {
            throw new Error('Function not implemented.');
          }}
        />
        {imageBoxes.map((item: {key: React.Key | null | undefined}) => (
          <ImageWithColorBox
            key={item.key}
            onDelete={() => handleDeleteImageBox(item.key)}
            theme={undefined}
            Stack={undefined}
            navigation={undefined}
            goToScreen={function (routeName: string): void {
              throw new Error('Function not implemented.');
            }}
          />
        ))}
      </ScrollView>
      <CustomHeader
        goToScreen={goToScreen}
        Stack={undefined}
        navigation={undefined}
        theme={theme}
        onDelete={function (): void {
          throw new Error('Function not implemented.');
        }}
      />
      <View style={style.addButtonContainer}>
        <TouchableOpacity style={style.addButton} onPress={addImageBox}>
          <AllIcons.Entyp name="plus" size={45} style={theme.settingsIcon} />
        </TouchableOpacity>
      </View>
      <TabBar
        goToScreen={goToScreen}
        theme={undefined}
        Stack={undefined}
        navigation={undefined}
        onDelete={function (): void {
          throw new Error('Function not implemented.');
        }}
      />
    </View>
  );
};

export default HomeScreen;

const style = StyleSheet.create({
  CarShadowContainer: {
    alignSelf: 'center',
    position: 'absolute',
    marginTop: '5%', // Adjust spacing as needed
    // elevat: 5,
    // shadowColor: 'black',
    // shadowOffset: {width: 0, height:4},
    // shadowOpacity: .3,
    // shadowRadius: 3,
  },

  imageWithColorBoxContainer: {
    flexDirection: 'column', // Arrange image and color box in a column
    alignItems: 'center', // Center items horizontally
  },
  imageContainer: {
    // borderColor: 'rgba(93, 138, 141, 1)',
    // borderWidth: 2,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    overflow: 'hidden', // This ensures the border is not visible outside the image
    borderBottomWidth: 0,
  },
  image: {
    width: 350, // Set image width
    height: 350, // Set image height
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  colorBox: {
    // position: 'relative',
    // alignItems: 'stretch',
    width: 350, // Set color box width (same as the image width)
    height: 90, // Set color box height
    backgroundColor: 'rgba(93, 138, 141, 0.6)', // Set color as needed
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },

  addButtonContainer: {
    position: 'absolute',
    bottom: 150,
    right: 30,
    shadowColor: 'black',
    shadowOffset: {width: 1, height: 3},
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  addButton: {
    position: 'relative',
    backgroundColor: '#5D8A8D',
    padding: 10,
    borderRadius: 50,
    text: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
  },
});
