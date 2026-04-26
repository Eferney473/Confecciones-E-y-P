import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';

const HomeScreen = ({ navigation }) => {
  const user = auth().currentUser;

  const handleLogout = () => {
    auth().signOut().then(() => navigation.replace('Login'));
  };

  // Componente Reutilizable para las Tarjetas
  const InfoCard = ({ title, value, icon, color, subtitle }) => (
    <TouchableOpacity style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <Icon name={icon} size={30} color="#FFF" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardValue}>{value}</Text>
        {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
      </View>
      <Icon name="chevron-right" size={24} color="#CCC" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* TOOLBAR */}
      <View style={styles.toolbar}>
        <Text style={styles.toolbarTitle}>Home</Text>
        <TouchableOpacity style={styles.notifBtn}>
          <Icon name="bell-outline" size={26} color="#FFF" />
          <View style={styles.badge} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* BIENVENIDA Y LOGOUT */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.welcomeText}>Hola,</Text>
            <Text style={styles.userName}>{user?.email.split('@')[0]}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Icon name="logout" size={20} color="#E17055" />
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>

        {/* TARJETAS DE ESTADO */}
        <InfoCard 
          title="Producción del Día" 
          value="125 Prendas" 
          icon="tshirt-crew" 
          color="#097678" 
          subtitle="Meta diaria: 150"
        />
        <InfoCard 
          title="Remisiones Activas" 
          value="12 Órdenes" 
          icon="file-document-outline" 
          color="#2D3436" 
        />
        <InfoCard 
          title="Alertas de Insumos" 
          value="3 Críticos" 
          icon="alert-circle-outline" 
          color="#E17055" 
          subtitle="Hilo negro, Elástico 2.5"
        />
        <InfoCard 
          title="Estado de Máquinas" 
          value="2 en Taller" 
          icon="cog-transfer" 
          color="#F1C40F" 
          subtitle="Fileteadora #4, Plana #2"
        />

        {/* TARJETA DE MENSAJES BODYLINE */}
        <TouchableOpacity style={[styles.card, styles.messageCard]}>
          <View style={styles.cardContent}>
            <Text style={styles.messageTitle}>Mensajes BodyLine</Text>
            <Text style={styles.messagePreview}>"Se envió nuevo material de fajas Ref 505..."</Text>
          </View>
          <Icon name="chat-processing-outline" size={30} color="#097678" />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  toolbar: { 
   backgroundColor: '#097678', 
    flexDirection: 'row', alignItems: 'center', 
    justifyContent: 'space-between', paddingHorizontal: 20 
  },
  toolbarTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  notifBtn: { position: 'relative' },
  badge: { 
    position: 'absolute', top: 2, right: 2, 
    width: 10, height: 10, backgroundColor: 'red', borderRadius: 5 
  },
  scrollContent: { padding: 20 },
  headerRow: { 
    flexDirection: 'row', justifyContent: 'space-between', 
    alignItems: 'center', marginBottom: 25 
  },
  welcomeText: { fontSize: 16, color: '#666' },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#2D3436' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center' },
  logoutText: { color: '#E17055', marginLeft: 5, fontWeight: 'bold' },
  card: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 15,
    flexDirection: 'row', alignItems: 'center', marginBottom: 15,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5
  },
  iconContainer: { padding: 10, borderRadius: 10, marginRight: 15 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 14, color: '#666' },
  cardValue: { fontSize: 18, fontWeight: 'bold', color: '#2D3436' },
  cardSubtitle: { fontSize: 12, color: '#999', marginTop: 2 },
  messageCard: { borderLeftWidth: 5, borderLeftColor: '#097678' },
  messageTitle: { fontSize: 16, fontWeight: 'bold', color: '#097678' },
  messagePreview: { fontSize: 13, color: '#666', marginTop: 4, fontStyle: 'italic' }
});

export default HomeScreen;