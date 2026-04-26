import React from 'react';
import { StatusBar } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';

const App = () => {
  return (
    <>
      {/* Configuramos la barra de estado para que combine con el teal del logo */}
      <StatusBar barStyle="light-content" backgroundColor="#097678" />
      <AppNavigator />
    </>
  );
};

export default App;