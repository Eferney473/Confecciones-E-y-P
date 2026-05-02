import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar, 
  Platform 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';

const HomeScreen = ({ navigation }) => {
  const user = auth().currentUser;
  const [stats, setStats] = useState({
    prendasDia: 0,
    remisionesActivas: 0,
    insumosCriticos: 0,
    insumosNombres: '',
    maquinasTaller: 0,
    maquinasNombres: '',
    ultimoMensaje: 'Sin mensajes',
    mensajesSinLeer: false,
  });

  useEffect(() => {
    if (!user) return;

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

    const subRemisiones = firestore().collection('remisiones').onSnapshot(snap => {
      let total = 0;
      let activas = 0;
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

    const subMensajes = firestore().collection('mensajes')
      .orderBy('fecha', 'desc').limit(1).onSnapshot(snap => {
        if (snap && !snap.empty) {
          const m = snap.docs[0].data();
          setStats(prev => ({
            ...prev,
            ultimoMensaje: m.texto,
            mensajesSinLeer: m.enviadoPor !== user.uid && m.leido === false,
          }));
        }
      });

    return () => {
      subRemisiones(); subInventario(); subMaquinas(); subMensajes();
    };
  }, [user]);

  const handleLogout = () => auth().signOut().then(() => navigation.replace('Login'));

  const getFirstName = () => {
    const rawName = user?.email?.split('@')[0] || 'Usuario';
    const nameOnly = rawName.split('.')[0];
    return nameOnly.charAt(0).toUpperCase() + nameOnly.slice(1);
  };

  return (
    <View style={styles.mainWrapper}>
      {/* StatusBar integrada al color del Toolbar */}
      <StatusBar barStyle="light-content" backgroundColor="#097678" />
      
      <SafeAreaView style={styles.safeArea}>
        
        {/* TU ÚNICO TOOLBAR */}
        <View style={styles.toolbar}> 
          <View style={styles.leftSpace} />
          <Text style={styles.toolbarTitle}>Inicio</Text>
          <TouchableOpacity 
            style={styles.messageIconContainer} 
            onPress={() => navigation.navigate('Mensajes')}
          >
            <Icon name="chat-processing-outline" size={26} color="#FFF" />
            {stats.mensajesSinLeer && <View style={styles.dotBadge} />}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.welcomeLabel}>Hola,</Text>
              <Text style={styles.userName}>{getFirstName()}</Text>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Icon name="power" size={18} color="#E17055" />
              <Text style={styles.logoutText}>Salir</Text>
            </TouchableOpacity>
          </View>

          {/* TARJETAS CON TEXTOS PEQUEÑOS Y ELEGANTES */}
          <InfoCard title="Producción" value={`${stats.prendasDia} Prendas`} icon="tshirt-crew" color="#097678" subtitle="En proceso" onPress={() => navigation.navigate('Produccion')} />
          <InfoCard title="Insumos" value={`${stats.insumosCriticos} Críticos`} icon="alert-circle" color="#E17055" subtitle={stats.insumosNombres} onPress={() => navigation.navigate('Inventario')} />
          <InfoCard title="Máquinas" value={`${stats.maquinasTaller} en Taller`} icon="cog" color="#F1C40F" subtitle={stats.maquinasNombres} onPress={() => navigation.navigate('Máquinas')} />
          <InfoCard title="Remisiones" value={`${stats.remisionesActivas} Activas`} icon="clipboard-text" color="#0F5EF1" subtitle="Pendientes" onPress={() => navigation.navigate('Remisiones')} />

          <TouchableOpacity 
            style={[styles.card, stats.mensajesSinLeer && styles.cardUnread]} 
            onPress={() => navigation.navigate('Mensajes')}
          >
            <View style={styles.cardContent}>
              <Text style={styles.cardTitleBold}>Último Mensaje</Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>{stats.ultimoMensaje}</Text>
            </View>
            {stats.mensajesSinLeer && <View style={styles.badgeRelative} />}
            <Icon name="chevron-right" size={22} color="#CCC" />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const InfoCard = ({ title, value, icon, color, subtitle, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.iconContainer, { backgroundColor: color }]}>
      <Icon name={icon} size={20} color="#FFF" />
    </View>
    <View style={styles.cardContent}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardValue}>{value}</Text>
      {subtitle ? <Text style={styles.cardSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
    </View>
    <Icon name="chevron-right" size={22} color="#CCC" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#097678' },
  safeArea: { flex: 1, backgroundColor: '#F4F7F6' },
  toolbar: { 
    backgroundColor: '#097678', 
    height: Platform.OS === 'android' ? 110 : 0,
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'android' ? 40 : 0, 
  },
  toolbarTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', textAlign: 'center', flex: 1 },
  leftSpace: { width: 40 }, 
  messageIconContainer: { width: 40, alignItems: 'flex-end', justifyContent: 'center', position: 'relative' },
  dotBadge: { position: 'absolute', top: -2, right: -2, width: 10, height: 10, backgroundColor: '#FF5252', borderRadius: 5, borderWidth: 1.5, borderColor: '#097678' },
  scrollContent: { padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  welcomeLabel: { fontSize: 13, color: '#9795a6' },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#2D3436', marginTop: -4 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, elevation: 2 },
  logoutText: { color: '#E17055', marginLeft: 4, fontWeight: 'bold', fontSize: 12 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 12, elevation: 2 },
  iconContainer: { padding: 10, borderRadius: 12, marginRight: 12 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 12, color: '#7F8C8D', fontWeight: '600', marginBottom: 1 },
  cardValue: { fontSize: 15, fontWeight: 'bold', color: '#2D3436' },
  cardTitleBold: { fontSize: 14, color: '#2D3436', fontWeight: 'bold' },
  cardSubtitle: { fontSize: 11, color: '#BDC3C7' }
});

export default HomeScreen;