import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
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
          if (!isNaN(cantidad)) {
            total += cantidad;
          }
        }
      });
      setStats(prev => ({ ...prev, prendasDia: total, remisionesActivas: activas }));
    }, error => console.log('Error Remisiones:', error));

    const subInventario = firestore().collection('inventario').onSnapshot(snap => {
      const criticos = [];
      snap?.forEach(doc => {
        if (parseInt(doc.data().cantidad || 0, 10) <= 10) {
          criticos.push(doc.data().nombre);
        }
      });
      setStats(prev => ({ ...prev, insumosCriticos: criticos.length, insumosNombres: criticos.slice(0, 2).join(', ') }));
    });

    const subMaquinas = firestore().collection('maquinas').onSnapshot(snap => {
      const t = [];
      snap?.forEach(doc => {
        const est = doc.data().estado?.toLowerCase();
        if (est && (est.includes('mantenimiento') || est.includes('falla'))) {
          t.push(doc.data().tipo);
        }
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
      }, error => {
        console.log('Error Firestore:', error);
      });

    return () => {
      subRemisiones(); subInventario(); subMaquinas(); subMensajes();
    };
  }, [user]);

  const handleLogout = () => auth().signOut().then(() => navigation.replace('Login'));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.toolbar}>
        <Text style={styles.toolbarTitle}>BodyLine Control</Text>
        <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Mensajes')}>
          <Icon name="chat-outline" size={26} color="#FFF" />
          {stats.mensajesSinLeer && <View style={styles.badge} />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.welcomeText}>Hola,</Text>
            <Text style={styles.userName}>{user?.email?.split('@')[0]}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Icon name="logout" size={20} color="#E17055" />
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>

        <InfoCard title="Producción" value={`${stats.prendasDia} Prendas`} icon="tshirt-crew" color="#097678" subtitle="En proceso" onPress={() => navigation.navigate('Produccion')} />
        <InfoCard title="Insumos" value={`${stats.insumosCriticos} Críticos`} icon="alert-circle" color="#E17055" subtitle={stats.insumosNombres} onPress={() => navigation.navigate('Inventario')} />
        <InfoCard title="Máquinas" value={`${stats.maquinasTaller} en Taller`} icon="cog" color="#F1C40F" subtitle={stats.maquinasNombres} onPress={() => navigation.navigate('Máquinas')} />
        <InfoCard title="Remisiones" value={`${stats.remisionesActivas} Activas`} icon="clipboard-text" color="#0f5ef1" subtitle={stats.remisionesNombres} onPress={() => navigation.navigate('Remisiones')} />

        <TouchableOpacity 
          style={[styles.card, stats.mensajesSinLeer && styles.cardUnread]} 
          onPress={() => navigation.navigate('Mensajes')}
        >
          <View style={styles.cardContent}>
            <Text style={styles.cardTitleBold}>Último Mensaje</Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>{stats.ultimoMensaje}</Text>
          </View>
          {stats.mensajesSinLeer && <View style={styles.badgeRelative} />}
          <Icon name="chevron-right" size={24} color="#CCC" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  toolbar: { backgroundColor: '#097678', height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  toolbarTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  notifBtn: { position: 'relative' },
  badge: { position: 'absolute', top: -2, right: -2, width: 12, height: 12, backgroundColor: 'red', borderRadius: 6, borderWidth: 1, borderColor: '#FFF' },
  badgeRelative: { position: 'relative', top: 0, right: 0, width: 12, height: 12, backgroundColor: 'red', borderRadius: 6, borderWidth: 1, borderColor: '#FFF' },
  scrollContent: { padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  welcomeText: { fontSize: 14, color: '#666' },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#2D3436' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center' },
  logoutText: { color: '#E17055', marginLeft: 5, fontWeight: 'bold' },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 12, elevation: 2 },
  cardUnread: { borderLeftColor: 'red', borderLeftWidth: 5 },
  iconContainer: { padding: 10, borderRadius: 10, marginRight: 15 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 13, color: '#666' },
  cardTitleBold: { fontSize: 13, color: '#666', fontWeight: 'bold' },
  cardValue: { fontSize: 17, fontWeight: 'bold', color: '#2D3436' },
  cardSubtitle: { fontSize: 12, color: '#999' },
});

const InfoCard = ({ title, value, icon, color, subtitle, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <View style={[styles.iconContainer, { backgroundColor: color }]}>
      <Icon name={icon} size={30} color="#FFF" />
    </View>
    <View style={styles.cardContent}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardValue}>{value}</Text>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
    </View>
    <Icon name="chevron-right" size={24} color="#CCC" />
  </TouchableOpacity>
);

export default HomeScreen;