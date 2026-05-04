import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, StyleSheet, ActivityIndicator, 
  SafeAreaView, TouchableOpacity, Alert 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const HistorialEntregasScreen = ({ navigation }) => {
  const [entregas, setEntregas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('operario');

  useEffect(() => {
    // Obtener rol del usuario
    const fetchUserRole = async () => {
      try {
        const user = auth().currentUser;
        if (user) {
          const userDoc = await firestore().collection('usuarios').doc(user.uid).get();
          if (userDoc.exists) setUserRole(userDoc.data().rol);
        }
      } catch (e) { console.log("Error rol:", e); }
    };
    fetchUserRole();

    const subscriber = firestore()
      .collection('historial_entregas')
      .orderBy('fechaEntrega', 'desc')
      .onSnapshot(querySnapshot => {
        const data = [];
        querySnapshot?.forEach(doc => {
          data.push({ ...doc.data(), id: doc.id });
        });
        setEntregas(data);
        setLoading(false);
      }, error => {
        console.error("Error al cargar historial:", error);
        setLoading(false);
      });

    return () => subscriber();
  }, []);

  const actualizarPago = async (id, nuevoEstado) => {
    // Solo gerente puede gestionar pagos
    if (userRole !== 'gerente') {
      Alert.alert("Sin permiso", "Solo el gerente puede gestionar el estado de pagos.");
      return;
    }
    try {
      await firestore().collection('historial_entregas').doc(id).update({
        estadoPago: nuevoEstado
      });
    } catch (e) {
      Alert.alert("Error", "No se pudo actualizar el estado de pago");
    }
  };

  const renderEntrega = ({ item }) => {
    const esPagada = item.estadoPago === 'Pagada';
    const puedeGestionarPago = userRole === 'gerente';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.fechaText}>
            {item.fechaEntrega?.toDate().toLocaleDateString()} - {item.fechaEntrega?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>#{item.numero}</Text>
          </View>
        </View>

        <Text style={styles.clienteName}>{item.cliente}</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Icon name="tshirt-crew" size={16} color="#666" />
            <Text style={styles.statText}>{item.unidades} Prendas</Text>
          </View>
          {/* Total: solo gerente */}
          {userRole === 'gerente' && (
            <View style={styles.stat}>
              <Icon name="currency-usd" size={16} color="#27ae60" />
              <Text style={[styles.statText, {color: '#27ae60', fontWeight: 'bold'}]}>
                ${item.totalGeneral?.toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* Gestión de pagos: solo gerente puede cambiar estado */}
        <View style={styles.pagoRow}>
          <View style={styles.infoPago}>
            <Text style={styles.labelPago}>Estado de Pago:</Text>
            <View style={[styles.statusBadge, { backgroundColor: esPagada ? '#eafaf1' : '#fef5e7' }]}>
              <Text style={[styles.statusBadgeText, { color: esPagada ? '#27ae60' : '#e67e22' }]}>
                {esPagada ? 'PAGADA' : 'PENDIENTE'}
              </Text>
            </View>
          </View>

          {puedeGestionarPago && (
            <TouchableOpacity 
              style={[styles.btnAccionPago, { backgroundColor: esPagada ? '#e67e22' : '#27ae60' }]}
              onPress={() => actualizarPago(item.id, esPagada ? 'Pendiente' : 'Pagada')}
            >
              <Icon name={esPagada ? "cash-minus" : "cash-check"} size={18} color="#FFF" />
              <Text style={styles.btnAccionText}>
                {esPagada ? "Revertir" : "Cobrar"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.divider, { marginTop: 12 }]} />

        <View style={styles.footer}>
          <Text style={styles.userText}>
            <Icon name="account-check" size={14} /> Entregado por: {item.entregadoPor?.split('@')[0]}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Despachos y cobros realizados</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#097678" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={entregas}
          renderItem={renderEntrega}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="truck-off" size={50} color="#CCC" />
              <Text style={styles.emptyText}>No hay registros de entrega</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  header: { padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#097678' },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  fechaText: { fontSize: 12, color: '#999', fontWeight: 'bold' },
  badge: { backgroundColor: '#EFFFFD', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5 },
  badgeText: { color: '#097678', fontWeight: 'bold', fontSize: 12 },
  clienteName: { fontSize: 18, fontWeight: 'bold', color: '#2D3436', marginBottom: 10 },
  statsRow: { flexDirection: 'row', marginBottom: 12 },
  stat: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  statText: { marginLeft: 5, fontSize: 14, color: '#444' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginBottom: 10 },
  pagoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  infoPago: { flexDirection: 'column' },
  labelPago: { fontSize: 11, color: '#999', marginBottom: 3 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 11, fontWeight: 'bold' },
  btnAccionPago: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, elevation: 1 },
  btnAccionText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8, fontSize: 13 },
  footer: { marginTop: 10 },
  userText: { fontSize: 11, color: '#7F8C8D', fontStyle: 'italic' },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 10, color: '#999' }
});

export default HistorialEntregasScreen;