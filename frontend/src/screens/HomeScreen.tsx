import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Image, ScrollView, Alert } from "react-native";
import AllIcons from "../assets/icons/Imported_Icons";
import { navigate } from "../services/navigationServices"; // Import the function
import { TouchableOpacity } from "react-native-gesture-handler";
import Progress_bar from "../components/ProgressBar";
import theme from "../styles/StylizedComponents";
import { RootStackParamList } from "../navigation/appNavigator";
import { StackNavigationProp } from "@react-navigation/stack";
import firebase, { db } from "../../firebaseConfig";


type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;


// Add this function somewhere in your component

// Update the test function
const testFirebaseConnection = () => {
  try {
    console.log("Testing Firebase connection...");
    console.log("Firebase imported:", firebase ? "YES" : "NO");
    console.log("Database imported:", db ? "YES" : "NO");

    // Only proceed if we have both Firebase and db
    if (firebase && db) {
      console.log("Attempting to write to Firestore...");

      // Simple write operation
      db.collection("test")
        .doc("connection-test")
        .set({
          timestamp: new Date().toISOString(),
          message: "Connection test successful",
          testValue: Math.random(),
        })
        .then(() => {
          console.log("Successfully wrote to Firestore!");
        })
        .catch((error) => {
          console.error("Error writing to Firestore:", error);
        });
    }

    return true;
  } catch (error) {
    console.error("Firebase connection test failed:", error);
    return false;
  }
};

// Call this function when appropriate, e.g. in useEffect
// useEffect(() => {
//   testFirebaseConnection();
// }, []);



const CustomHeader: React.FC<{ goToScreen: (routeName: keyof RootStackParamList) => void }> = ({
  goToScreen,
}) => (
  <View style={theme.headerContainer}>
    <View style={theme.headerBackground} />
    <Text style={theme.headerText}>My Garage</Text>
    <View style={theme.settingsButtonContainer}>
      <TouchableOpacity onPress={testFirebaseConnection}>
        <AllIcons.MatComIcons name="cog" size={30} style={theme.settingsIcon} />
      </TouchableOpacity>
    </View>
  </View>
);

const TabBar: React.FC<{ goToScreen: (routeName: keyof RootStackParamList) => void }> = ({
  goToScreen,
}) => (
  <View style={theme.tabContainer}>
    <View style={theme.tabBackground} />
    <View style={theme.tabButton}>
      <TouchableOpacity onPress={() => navigate("CarDashboard", { carId: "someCarId" })
}>
        <AllIcons.MatComIcons
          name="car-wrench"
          size={55}
          style={theme.settingsIcon}
        />
        <Text style={theme.tabText}>Issue?</Text>
      </TouchableOpacity>
    </View>
    <View style={theme.tabButton}>
      <TouchableOpacity onPress={() => navigate("ClickMenu")}>
        <AllIcons.MatComIcons
          name="account-wrench"
          size={55}
          style={theme.settingsIcon}
        />
        <Text style={theme.tabText}>Connect</Text>
      </TouchableOpacity>
    </View>
    <View style={theme.tabButton}>
      <TouchableOpacity onPress={() => goToScreen("ScanDevices")}>
        <AllIcons.Oct_Icons name="graph" size={45} style={theme.settingsIcon} />
        <Text style={theme.tabText}>Live Data</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const ImageWithColorBox: React.FC<{ onDelete: () => void }> = ({
  onDelete,
}) => {
  const mileageSinceLastOilChange = 3800;
  const mileageSinceLastRotation = 3000;

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

  return (
    <TouchableOpacity onLongPress={onDelete}>
      <View style={style.CarShadowContainer}>
        <View style={style.imageWithColorBoxContainer}>
          <View style={style.imageContainer}>
            <Image
              source={require("../assets/images/IMG_2037.jpeg")}
              style={style.image}
            />
          </View>
          <View style={style.colorBox}>
            <AllIcons.FA5 name="oil-can" size={40} />
            <Progress_bar progress={getOilChangeProgress()} height="20%" />
            <AllIcons.MatComIcons name="tire" size={40} />
            <Progress_bar progress={getTireRotationProgress()} height="20%" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const HomeScreen: React.FC = () => {

  const [imageBoxes, setImageBoxes] = useState<{ key: string }[]>([]);

  const addImageBox = () => {
    const newKey = Math.random().toString(36).substring(7);
    setImageBoxes((prevImageBoxes) => [...prevImageBoxes, { key: newKey }]);
  };

  const handleDeleteImageBox = (boxKey: string) => {
    Alert.alert(
      "Delete Vehicle?",
      "Are you sure you want to delete this vehicle?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteImageBox(boxKey),
        },
      ],
      { cancelable: true }
    );
  };

  const deleteImageBox = (boxKey: string) => {
    setImageBoxes((prevImageBoxes) =>
      prevImageBoxes.filter((item) => item.key !== boxKey)
    );
  };

  return (
    <View style={theme.homeView}>
      <ScrollView style={theme.scrollContainer}>
        <ImageWithColorBox onDelete={() => handleDeleteImageBox("default")} />
        {imageBoxes.map((item) => (
          <ImageWithColorBox
            key={item.key}
            onDelete={() => handleDeleteImageBox(item.key)}
          />
        ))}
      </ScrollView>
      <CustomHeader goToScreen={navigate} />
      <View style={style.addButtonContainer}>
        <TouchableOpacity style={style.addButton} onPress={addImageBox}>
          <AllIcons.Entyp name="plus" size={45} style={theme.settingsIcon} />
        </TouchableOpacity>
      </View>
      <TabBar goToScreen={navigate} />
    </View>
  );
};

export default HomeScreen;

const style = StyleSheet.create({
  CarShadowContainer: {
    alignSelf: "center",
    marginTop: "5%",
  },
  imageWithColorBoxContainer: {
    flexDirection: "column",
    alignItems: "center",
  },
  imageContainer: {
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    overflow: "hidden",
    borderBottomWidth: 0,
  },
  image: {
    width: 350,
    height: 350,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  colorBox: {
    width: 350,
    height: 90,
    backgroundColor: "rgba(93, 138, 141, 0.6)",
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  addButtonContainer: {
    position: "absolute",
    bottom: 150,
    right: 30,
    shadowColor: "black",
    shadowOffset: { width: 1, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  addButton: {
    position: "relative",
    backgroundColor: "#5D8A8D",
    padding: 10,
    borderRadius: 50,
  },
});
