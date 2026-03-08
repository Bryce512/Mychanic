# Module Fixes

Some node modules require patches to work correctly. After installing dependencies, run:

```bash
./fix-modules.sh

```
# App Start up Commands

Start up app after you've already installed it
```
npx expo start
```

Install on ios simulator/ iphone
* You need to do this if you havent run the simulator in a while or installing for the first time
```
npx expo run:ios --device
```
Run on Android
```
npx expo run:android --device
```

# Installing for the First Time
For the first install or any time you add a new package with either "React-Native-*" or "Expo-*" you will need to reinstall the NPM packages and CocoaPods.

In the terminal, cd to the root directory
>cd Mychanic

Then delete node modules, ios/build, ios/Pods, and ios/ Podfile.lock

```
rm -rf node_modules
rm -rf ios/build
rm -rf ios/ Pods
rm ios/Podfile.lock
```
Then reinstall the node modules & cocoaPods from the ROOT DIR
```
npm install
cd ios
pod install
cd ..
npx expo run:ios --device
```