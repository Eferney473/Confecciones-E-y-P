import React, { useState, useEffect } from 'react'; // Agregado
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore'; // Agregado

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

const MainTabs = () => {
  const [pendientesCount, setPendientesCount] = useState(0);

  useEffect(() => {
    // 1. Creamos la referencia a la colección
    // Usamos onSnapshot para que Firebase nos avise CUALQUIER cambio al instante
    const unsub = firestore()
      .collection('remisiones')
      .where('estadoProduccion', '==', 'Pendiente') // Filtro estricto
      .onSnapshot(querySnapshot => {
        if (querySnapshot) {
          // 2. Actualizamos el estado con el tamaño de la consulta
          setPendientesCount(querySnapshot.size);
          console.log("Notificaciones actualizadas: ", querySnapshot.size);
        }
      }, error => {
        console.error("Error en el contador de tiempo real:", error);
      });

    // 3. Limpieza: Detiene el listener cuando el usuario sale de la app
    return () => unsub();
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#097678' },
        headerTintColor: '#FFF',
        headerTitleAlign: 'center',
        tabBarActiveTintColor: '#097678',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { paddingBottom: 10 },
      })}
    >
      <Tab.Screen 
        name="Inicio" 
        component={HomeScreen} 
        options={{ 
          tabBarIcon: ({ color, size }) => <Icon name="home" size={size} color={color} /> 
        }} 
      />
      <Tab.Screen 
        name="Inventario" 
        component={InventarioScreen} 
        options={{ 
          tabBarIcon: ({ color, size }) => <Icon name="archive-outline" size={size} color={color} /> 
        }} 
      />
      <Tab.Screen 
        name="Produccion" 
        component={ProduccionScreen} 
        options={{
          tabBarLabel: 'Producción',
          // 4. Lógica visual del Badge
          tabBarBadge: pendientesCount > 0 ? pendientesCount : null,
          tabBarBadgeStyle: { backgroundColor: '#E74C3C', color: 'white' },
          tabBarIcon: ({ color, size }) => <Icon name="factory" color={color} size={size} />,
        }} 
      />
      <Tab.Screen 
        name="Remisiones" 
        component={RemisionesScreen} 
        options={{ 
          tabBarIcon: ({ color, size }) => <Icon name="truck-outline" size={size} color={color} /> 
        }} 
      />
      <Tab.Screen 
        name="Máquinas" 
        component={MaquinasScreen} 
        options={{ 
          tabBarIcon: ({ color, size }) => <Icon name="cog" size={size} color={color} /> 
        }} 
      />
      <Tab.Screen 
        name="Mensajes" 
        component={MensajesScreen} 
        options={{ 
          tabBarIcon: ({ color, size }) => <Icon name="chat-outline" size={size} color={color} /> 
        }} 
      />
    </Tab.Navigator>
  );
};

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