import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import theme from '../styles/StylizedComponents';
import AllIcons from '../assets/icons/Imported_Icons';
// import { Modal } from 'react-native-modal';

interface Props {
  theme: any;
  Stack: any;
  navigation: any;
}

const DashLib: React.FC<Props> = ({theme}) => {
  // const [isModalVisible, setModalVisible] = useState(false); // Modal visibility state

  const iconsData = [
    {name: 'car-battery', size: 70},
    {name: 'car-brake-abs', size: 70},
    {name: 'car-brake-alert', size: 70},
    {name: 'car-brake-parking', size: 70},
    {name: 'engine', size: 70},
    {name: 'hazard-lights', size: 70},
    {name: 'coolant-temperature', size: 70},
    {name: 'car-coolant-level', size: 70},
    {name: 'car-cruise-control', size: 70},
    {name: 'car-traction-control', size: 70},
    {name: 'car-tire-alert', size: 70},
    {name: 'seatbelt', size: 70},
    {name: 'car-defrost-front', size: 70},
    {name: 'car-defrost-rear', size: 70},
    {name: 'car-esp', size: 70},
    {name: 'car-light-alert', size: 70},
    {name: 'car-light-dimmed', size: 70},
    {name: 'car-light-fog', size: 70},
    {name: 'car-light-high', size: 70},
    {name: 'car-parking-lights', size: 70},
    {name: 'car-seat-cooler', size: 70},
    {name: 'car-seat-heater', size: 70},
    // { name: 'coolant-temperature', size: 70, style: style.blueCoolant},
    {name: 'oil-temperature', size: 70},
    {name: 'oil-level', size: 70},
    {name: 'wiper-wash', size: 70},

    // Add more icons here
  ];

  const renderIcons = () => {
    const iconsPerRow = 3; // Number of icons per row
    const rows = Math.ceil(iconsData.length / iconsPerRow);

    const iconRows = [];
    for (let i = 0; i < rows; i++) {
      const iconsInRow = iconsData.slice(
        i * iconsPerRow,
        (i + 1) * iconsPerRow,
      );
      const iconRow = (
        <View style={style.rowContainer} key={i}>
          {iconsInRow.map(icon => (
            <AllIcons.MatComIcons
              key={icon.name}
              name={icon.name}
              size={icon.size}
            />
          ))}
        </View>
      );
      iconRows.push(iconRow);
    }

    return iconRows;
  };
  // const toggleModal = () => {
  //   setModalVisible(!isModalVisible); // Toggle modal visibility
  // };

  // return (
  //   <View style={theme.homeView}>
  //     {renderIcons()}

  //      {/* Add this Modal */}
  //      <Modal isVisible={isModalVisible}>
  //       <View style={styles.modalContent}>
  //         <Text>Basic Information about the Icon</Text>
  //         <TouchableOpacity onPress={toggleModal}>
  //           <Text>Close</Text>
  //         </TouchableOpacity>
  //       </View>
  //     </Modal>

  //   </View>
  // );

  // const renderIcons = () => {
  //   return iconsData.map(icon => (
  //     <AllIcons.Car_prob_Icon key={icon.name} name={icon.name} size={icon.size} />
  //   ));
  // };

  return (
    <View style={theme.homeView}>
      <ScrollView>
        <View style={style.libContainer}>{renderIcons()}</View>
      </ScrollView>
    </View>
  );
};

//   return (
//     <View style={theme.homeView}>
//       <View style={style.libContainer}>
//         <AllIcons.Car_prob_Icon name='car-wrench' size={48}/>
//         <AllIcons.Battery name= 'car-battery' size={48}/>
//       </View>
//     </View>
//   );
// }

export default DashLib;

const style = StyleSheet.create({
  libContainer: {
    top: '5%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    shadowColor: 'black',
    shadowOffset: {width: 3, height: 5},
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 20, // Adjust the spacing between rows
    top: '5%',
    width: '100%',
  },
  blueCoolant: {
    color: 'white',
  },
});

// import React, { useState } from 'react';
// import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
// import theme from '../../StylizedComponents';
// import AllIcons from '../../../assets/icons/Imported_Icons';

// interface Props {
//   theme: any;
//   Stack: any;
//   navigation: any;
// }

// const DashLib: React.FC<Props> = ({ theme }) => {
//   const [selectedIcon, setSelectedIcon] = useState(null); // Track selected icon
//   const [isModalVisible, setModalVisible] = useState(false); // Modal visibility state

//   const iconsData = [
//     { name: 'car-wrench', size: 70 },
//     { name: 'car-battery', size: 70 },
//     { name: 'cog', size: 70 },
//     { name: 'car-brake-abs', size: 70 },
//     // Add more icons here
//   ];

//   const toggleModal = (iconName) => {
//     setSelectedIcon(iconName); // Set the selected icon
//     setModalVisible(!isModalVisible); // Toggle modal visibility
//   };

//   return (
//     <View style={theme.homeView}>
//       <View style={styles.libContainer}>
//         {iconsData.map((icon) => (
//           <TouchableOpacity
//             key={icon.name}
//             style={styles.iconContainer}
//             onPress={() => toggleModal(icon.name)}
//           >
//             <AllIcons.Car_prob_Icon name={icon.name} size={icon.size} />
//           </TouchableOpacity>
//         ))}
//       </View>

//       {/* Add this Modal */}
//       <Modal isVisible={isModalVisible}>
//         <View style={styles.modalContent}>
//           <Text>Basic Information about the Icon: {selectedIcon}</Text>
//           <TouchableOpacity onPress={() => setModalVisible(false)}>
//             <Text>Close</Text>
//           </TouchableOpacity>
//         </View>
//       </Modal>
//     </View>
//   );
// };

// export default DashLib;

// const styles = StyleSheet.create({
//   libContainer: {
//     top: '5%',
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     justifyContent: 'space-between',
//     paddingHorizontal: 20,
//   },
//   iconContainer: {
//     marginBottom: 20,
//   },
//   modalContent: {
//     backgroundColor: 'white',
//     padding: 20,
//     borderRadius: 10,
//   },
// });
