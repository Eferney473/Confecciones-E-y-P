import React, { useState, useEffect } from 'react'; // Agregado
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import firestore from '@react-native-firebase/firestore'; 
import auth from '@react-native-firebase/auth';

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
  const [userRole, setUserRole] = useState(null); 
  
  // Obtenemos el usuario actual de Firebase Auth
  const user = auth().currentUser;

  useEffect(() => {
    // Solo pedimos el rol si existe un usuario autenticado
    const fetchRole = async () => {
      if (user) {
        try {
          const doc = await firestore().collection('usuarios').doc(user.uid).get();
          if (doc.exists) {
            setUserRole(doc.data()?.rol);
          }
        } catch (error) {
          console.error("Error obteniendo rol:", error);
        }
      }
    };

    fetchRole();

    // Listener de notificaciones
    const unsub = firestore()
      .collection('remisiones')
      .where('estadoProduccion', '==', 'Pendiente')
      .onSnapshot(querySnapshot => {
        if (querySnapshot) {
          setPendientesCount(querySnapshot.size);
        }
      }, error => console.log(error));

    return () => unsub();
  }, [user]); // Se ejecuta cada vez que el usuario cambie

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#097678' },
        headerTintColor: '#FFF',
        headerTitleAlign: 'center',
        tabBarActiveTintColor: '#097678',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { paddingBottom: 10 },
        tabBarHideOnKeyboard: true, // Esto oculta las pestañas cuando sale el teclado
      }}
    >
      <Tab.Screen 
        name="Inicio" 
        component={HomeScreen} 
        options={{ tabBarIcon: ({ color, size }) => <Icon name="home" size={size} color={color} /> }} 
      />
      <Tab.Screen 
        name="Inventario" 
        component={InventarioScreen} 
        options={{ tabBarIcon: ({ color, size }) => <Icon name="archive-outline" size={size} color={color} /> }} 
      />
      <Tab.Screen 
        name="Produccion" 
        component={ProduccionScreen} 
        options={{
          tabBarLabel: 'Producción',
          tabBarBadge: pendientesCount > 0 ? pendientesCount : null,
          tabBarBadgeStyle: { backgroundColor: '#E74C3C', color: 'white' },
          tabBarIcon: ({ color, size }) => <Icon name="factory" color={color} size={size} />,
        }} 
      />
      <Tab.Screen 
        name="Remisiones" 
        component={RemisionesScreen} 
        options={{ tabBarIcon: ({ color, size }) => <Icon name="truck-outline" size={size} color={color} /> }} 
      />
      <Tab.Screen 
        name="Máquinas" 
        component={MaquinasScreen} 
        options={{ tabBarIcon: ({ color, size }) => <Icon name="cog" size={size} color={color} /> }} 
      />

      {/* Solo mostramos la pestaña de Mensajes si el rol NO es operario */}
      {userRole !== 'operario' && (
        <Tab.Screen 
          name="Mensajes" 
          component={MensajesScreen} 
          options={{ 
            tabBarIcon: ({ color, size }) => <Icon name="chat-outline" size={size} color={color} /> 
          }} 
        />
      )}
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