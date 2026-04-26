import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Pantallas
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import InventarioScreen from '../screens/InventarioScreen';
import ProduccionScreen from '../screens/ProduccionScreen';
import RemisionesScreen from '../screens/RemisionesScreen';
import MaquinasScreen from '../screens/MaquinasScreen';
import MensajesScreen from '../screens/MensajesScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Este es el Navegador de Pestañas Inferiores
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#097678' }, // Color del Toolbar
        headerTintColor: '#FFF', // Color del texto del Toolbar
        headerTitleAlign: 'center',
        tabBarActiveTintColor: '#097678',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { paddingBottom: 10 },
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Inicio') iconName = 'home';
          else if (route.name === 'Inventario') iconName = 'archive-outline';
          else if (route.name === 'Producción') iconName = 'factory';
          else if (route.name === 'Mensajes') iconName = 'chat-outline';
          else if (route.name === 'Remisiones') iconName = 'truck-outline';
          else if (route.name === 'Máquinas') iconName = 'cog';
          else if (route.name === 'Mensajes') iconName = 'chat-outline';

          return <Icon name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} options={{ title: 'Inicio' }} />
      {/* Agrega más pestañas aquí cuando crees los archivos de las pantallas */}
      <Tab.Screen name="Inventario" component={InventarioScreen} options={{ title: 'Inventario' }} />
      <Tab.Screen name="Producción" component={ProduccionScreen} options={{ title: 'Producción' }} />
      <Tab.Screen name="Remisiones" component={RemisionesScreen} options={{ title: 'Remisiones' }} />
      <Tab.Screen name="Máquinas" component={MaquinasScreen} options={{ title: 'Máquinas' }} />
      <Tab.Screen name="Mensajes" component={MensajesScreen} options={{ title: 'Mensajes' }} />
    </Tab.Navigator>
  );
};

// Navegador Principal (Stack)
const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={MainTabs} /> 
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;