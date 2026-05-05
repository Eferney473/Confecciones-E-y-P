import React, { useState, useEffect } from 'react';
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
import HistorialEntregasScreen from '../screens/HistorialEntregasScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  const [pendientesCount, setPendientesCount] = useState(0);
  const [mensajesNuevosCount, setMensajesNuevosCount] = useState(0); // Nueva variable corregida
  const [userRole, setUserRole] = useState(null); 
  const user = auth().currentUser;

  useEffect(() => {
    // 1. Cargar Rol del Usuario
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

    // 2. Listener para Remisiones Pendientes
    const unsubRemisiones = firestore()
      .collection('remisiones')
      .where('estadoProduccion', '==', 'Pendiente')
      .onSnapshot(querySnapshot => {
        if (querySnapshot) {
          setPendientesCount(querySnapshot.size);
        }
      });

    // 3. Listener para Mensajes no leídos (PUNTO ROJO)
    const unsubMensajes = firestore()
      .collection('mensajes')
      .where('leido', '==', false)
      .onSnapshot(querySnapshot => {
        if (querySnapshot) {
          // Filtramos para que solo cuente los mensajes que NO envié yo
          const noLeidos = querySnapshot.docs.filter(doc => doc.data().enviadoPor !== user?.uid);
          setMensajesNuevosCount(noLeidos.length);
        }
      });

    return () => {
      unsubRemisiones();
      unsubMensajes();
    };
  }, [user]);

  // No renderizar hasta tener el rol
  if (!userRole) return null;

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#097678' },
        headerTintColor: '#FFF',
        headerTitleAlign: 'center',
        tabBarActiveTintColor: '#097678',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { paddingBottom: 10 },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ 
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Icon name="home-outline" size={size} color={color} /> 
        }}
      />
      <Tab.Screen 
        name="Inventario" 
        component={InventarioScreen} 
        options={{ 
          title: 'Inventario',
          tabBarIcon: ({ color, size }) => <Icon name="archive-outline" size={size} color={color} /> 
        }} 
      />
      <Tab.Screen 
        name="Produccion" 
        component={ProduccionScreen} 
        options={{
          title: 'Producción',
          tabBarLabel: 'Producción',
          tabBarBadge: pendientesCount > 0 ? pendientesCount : null,
          tabBarBadgeStyle: { backgroundColor: '#E74C3C', color: 'white' },
          tabBarIcon: ({ color, size }) => <Icon name="factory" color={color} size={size} />,
        }} 
      />

      <Tab.Screen 
        name="Remisiones" 
        component={RemisionesScreen} 
        options={{ 
          title: 'Remisiones',
          tabBarIcon: ({ color, size }) => <Icon name="truck-outline" size={size} color={color} /> 
        }} 
      />

      <Tab.Screen 
        name="Máquinas" 
        component={MaquinasScreen} 
        options={{ 
          title: 'Máquinas',
          tabBarIcon: ({ color, size }) => <Icon name="cog" size={size} color={color} /> 
        }} 
      />

      {/* Mensajes con Badge dinámico */}
      {userRole !== 'operario' && (
        <Tab.Screen 
          name="Mensajes" 
          component={MensajesScreen} 
          options={{ 
            title: 'Mensajes',
            // Si hay mensajes nuevos, muestra el número o un punto vacío ""
            tabBarBadge: mensajesNuevosCount > 0 ? mensajesNuevosCount : null,
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
        <Stack.Screen 
          name="HistorialEntregas" 
          component={HistorialEntregasScreen} 
          options={{ 
            headerShown: true,
            title: 'Historial de Salidas',
            headerStyle: { backgroundColor: '#097678' },
            headerTintColor: '#FFF',
          }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;