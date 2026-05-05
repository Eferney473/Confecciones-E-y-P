import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar, 
  Platform,
  Image 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';

const HomeScreen = ({ navigation }) => {
  const user = auth().currentUser;
  const [realName, setRealName] = useState('');
  const [stats, setStats] = useState({
    prendasDia: 0,
    remisionesActivas: 0,
    insumosCriticos: 0,
    insumosNombres: '',
    maquinasTaller: 0,
    maquinasNombres: '',
  });

  useEffect(() => {
    if (!user) return;

    // Obtener nombre real
    const fetchUserData = async () => {
      try {
        const doc = await firestore().collection('usuarios').doc(user.uid).get();
        if (doc.exists && doc.data().nombre) {
          setRealName(doc.data().nombre);
        }
      } catch (error) {
        console.log("Error obteniendo nombre:", error);
      }
    };
    fetchUserData();

    // Notificaciones (FCM)
    const setupNotifications = async () => {
      const authStatus = await messaging().requestPermission();
      if (authStatus === messaging.AuthorizationStatus.AUTHORIZED) {
        const token = await messaging().getToken();
        await firestore().collection('usuarios').doc(user.uid).set({
          fcmToken: token,
          email: user.email,
          lastActive: firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    };
    setupNotifications();

    // Suscripciones a Firestore
    const subRemisiones = firestore().collection('remisiones').onSnapshot(snap => {
      let total = 0; let activas = 0;
      snap?.forEach(doc => {
        const data = doc.data();
        if (data.estadoProduccion !== 'Entregado') {
          activas++;
          const cantidad = parseInt(data.totalPrendas, 10);
          if (!isNaN(cantidad)) total += cantidad;
        }
      });
      setStats(prev => ({ ...prev, prendasDia: total, remisionesActivas: activas }));
    });

    const subInventario = firestore().collection('inventario').onSnapshot(snap => {
      const criticos = [];
      snap?.forEach(doc => {
        if (parseInt(doc.data().cantidad || 0, 10) <= 10) criticos.push(doc.data().nombre);
      });
      setStats(prev => ({ ...prev, insumosCriticos: criticos.length, insumosNombres: criticos.slice(0, 2).join(', ') }));
    });

    const subMaquinas = firestore().collection('maquinas').onSnapshot(snap => {
      const t = [];
      snap?.forEach(doc => {
        const est = doc.data().estado?.toLowerCase();
        if (est && (est.includes('mantenimiento') || est.includes('falla'))) t.push(doc.data().tipo);
      });
      setStats(prev => ({ ...prev, maquinasTaller: t.length, maquinasNombres: t.join(', ') || 'Operativas' }));
    });

    return () => {
      subRemisiones(); subInventario(); subMaquinas();
    };
  }, [user]);

  const handleLogout = () => auth().signOut().then(() => navigation.replace('Login'));

  const getDisplayName = () => {
    if (realName) return realName;
    const rawName = user?.email?.split('@')[0] || 'Usuario';
    const nameOnly = rawName.split('.')[0];
    return nameOnly.charAt(0).toUpperCase() + nameOnly.slice(1);
  };

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#097678" />
      
      <SafeAreaView style={styles.safeArea}>
        
        {/* TOOLBAR ACTUALIZADO: Sin mensaje, con Logo del taller */}
        <View style={styles.toolbar}> 
          <View style={styles.logoContainerToolbar}>
             <Image 
                source={require('../assets/logo.png')} 
                style={styles.logoMini}
                resizeMode="contain"
             />
          </View>
          <Text style={styles.toolbarTitle}>Inicio</Text>
          <View style={styles.rightSpace} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.welcomeLabel}>Hola,</Text>
              <Text style={styles.userName}>{getDisplayName()}</Text>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Icon name="power" size={18} color="#E17055" />
              <Text style={styles.logoutText}>Salir</Text>
            </TouchableOpacity>
          </View>

          {/* Tarjetas con mayor altura y diseño más limpio */}
          <InfoCard title="Producción" value={`${stats.prendasDia} Prendas`} icon="tshirt-crew" color="#097678" subtitle="En proceso de confección" onPress={() => navigation.navigate('Produccion')} />
          <InfoCard title="Insumos" value={`${stats.insumosCriticos} Críticos`} icon="alert-circle" color="#E17055" subtitle={stats.insumosNombres || "Inventario al día"} onPress={() => navigation.navigate('Inventario')} />
          <InfoCard title="Máquinas" value={`${stats.maquinasTaller} en Falla`} icon="cog" color="#F1C40F" subtitle={stats.maquinasNombres} onPress={() => navigation.navigate('Máquinas')} />
          <InfoCard title="Remisiones" value={`${stats.remisionesActivas} Activas`} icon="clipboard-text" color="#0F5EF1" subtitle="Pendientes por entregar" onPress={() => navigation.navigate('Remisiones')} />

        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

// Componente InfoCard con altura ajustada (padding de 20 en lugar de 14)
const InfoCard = ({ title, value, icon, color, subtitle, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.iconContainer, { backgroundColor: color }]}>
      <Icon name={icon} size={28} color="#FFF" />
    </View>
    <View style={styles.cardContent}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardValue}>{value}</Text>
      {subtitle ? <Text style={styles.cardSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
    </View>
    <Icon name="chevron-right" size={26} color="#CCC" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#097678' },
  safeArea: { flex: 1, backgroundColor: '#F4F7F6' },
  toolbar: { 
    backgroundColor: '#097678', 
    height: Platform.OS === 'android' ? 100 : 60,
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'android' ? 30 : 0, 
  },
  logoContainerToolbar: { width: 50, height: 50, justifyContent: 'center' },
  logoMini: { width: 65, height: 65,  }, // El tintColor pone el logo blanco para que resalte
  toolbarTitle: { color: '#FFF', fontSize: 19, fontWeight: 'bold', textAlign: 'center', flex: 1, marginRight: 50 },
  rightSpace: { width: 0 }, 
  scrollContent: { padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  welcomeLabel: { fontSize: 14, color: '#9795a6' },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#2D3436', marginTop: -2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, elevation: 3 },
  logoutText: { color: '#E17055', marginLeft: 4, fontWeight: 'bold', fontSize: 13 },
  
  // TARJETAS MÁS ALTAS Y VISIBLES
  card: { 
    backgroundColor: '#FFF', 
    borderRadius: 20, 
    padding: 20, // Aumentado para mayor altura
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16, 
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  iconContainer: { padding: 14, borderRadius: 16, marginRight: 15 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 14, color: '#7F8C8D', fontWeight: '600', marginBottom: 2 },
  cardValue: { fontSize: 18, fontWeight: 'bold', color: '#2D3436' },
  cardSubtitle: { fontSize: 12, color: '#BDC3C7', marginTop: 2 }
});

export default HomeScreen;