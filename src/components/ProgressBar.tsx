import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

const Progress_bar = ({progress, height}) => {
  const progcolor = percentage => {
    if (percentage <= 10) {
      return 'red';
    } else if (percentage <= 25) {
      return 'yellow';
    } else {
      return 'green';
    }
  };

  const Parentdiv = {
    height: height,
    width: '70%',
    backgroundColor: 'whitesmoke',
    borderRadius: 10,
    marginTop: '6%',
    marginLeft: '20%',
    position: 'relative',
    overflow: 'hidden',
  };

  const Childdiv = {
    height: '100%',
    width: `${progress}%`,
    backgroundColor: progcolor(progress),
    borderRadius: parseFloat(height) / 2,
    alignItems: 'center',
    position: 'absolute',
    // borderColor: 'grey',
    // borderWidth: .5,
  };

  const progresstext = {
    padding: 1,
    color: 'black',
    fontWeight: 500,
    position: 'relative',
    zIndex: 1,
    marginLeft: '10%',
  };

  return (
    <View style={Parentdiv}>
      <Text style={progresstext}>{`${progress}%`}</Text>
      <View style={Childdiv} />
    </View>
  );
};

export default Progress_bar;

const style = StyleSheet.create({});
