import React, { useEffect } from 'react';
import { View, Image, StyleSheet, StatusBar } from 'react-native';
import auth from '@react-native-firebase/auth';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    setTimeout(() => {
      // Verifica si el usuario ya está logueado
      const user = auth().currentUser;
      if (user) {
        navigation.replace('Main');
      } else {
        navigation.replace('Login');
      }
    }, 3000);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Image 
        source={require('../assets/logo.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#097678', justifyContent: 'center', alignItems: 'center' },
  logo: { width: '80%', height: '80%' }
});

export default SplashScreen;