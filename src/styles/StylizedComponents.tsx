import {StyleSheet} from 'react-native';

const darkColor = '#5D8A8D';
const buttonColor = 'rgba(93, 138, 141, 0.6)';

const theme = StyleSheet.create({
  homeView: {
    flex: 1,
    backgroundColor: 'rgba(93, 138, 141, .3)',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    top: 0,
  },

  //* Header Styling*//
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: '4%', // Add paddingTop to account for StatusBar
    height: '14%',
  },
  headerBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#5D8A8D',
  },
  headerText: {
    position: 'relative',
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    width: '100%',
    marginTop: '10%',
    textAlign: 'center',
  },

  backButtonContainer: {
    position: 'relative',
    left: 15,
    bottom: 30,
    backgroundColor: 'white',
    width: '15%',
  },
  backButton: {
    backgroundColor: 'white',
    fontSize: 20,
    fontWeight: '200',
    textAlign: 'center',
  },
  settingsButtonContainer: {
    position: 'relative',
    bottom: '7%',
    flexDirection: 'row-reverse',
    right: 30,
    color: 'whitesmoke',
  },
  settingsIcon: {
    color: 'whitesmoke',
  },

  //*Scroll Container*//
  scrollContainer: {
    flexGrow: 1,
    paddingVertical: 125, // Adjust this value to set the height of the HomeScreen header from the bottom
    width: '100%',
  },

  //* Tab Styling *//
  tabContainer: {
    position: 'absolute',
    flexDirection: 'row',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    height: '10%',
  },
  tabBackground: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#5D8A8D',
  },
  tabButton: {
    position: 'relative',
    alignContent: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    flex: 1,
    borderRadius: 10,
  },
  tabText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: 'bold',
  },

  //* Click ID Menu button Styling*//
  menuText: {
    position: 'absolute',
    fontSize: 20,
    alignSelf: 'flex-start',
    marginLeft: '3%',
    marginTop: '5%',
    top: 0,
    color: 'Black',
  },
  clickButtonContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: '20%',
  },
  menuButton: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5D8A8D',
    borderRadius: 20,
    width: 275,
    height: 59,
    margin: 10,
    shadowColor: 'black',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  menuButtonText: {
    color: 'white',
    fontSize: 27,
    fontWeight: '300',
  },
});

export default theme;
