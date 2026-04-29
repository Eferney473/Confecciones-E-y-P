import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, StyleSheet, ActivityIndicator, SafeAreaView 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';

const HistorialInventarioScreen = () => {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subscriber = firestore()
      .collection('historial_inventario')
      .orderBy('fecha', 'desc') // Los más nuevos primero
      .onSnapshot(querySnapshot => {
        const data = [];
        querySnapshot?.forEach(doc => {
          data.push({ ...doc.data(), id: doc.id });
        });
        setHistorial(data);
        setLoading(false);
      }, error => {
        console.error("Error cargando historial:", error);
        setLoading(false);
      });

    return () => subscriber();
  }, []);

  const renderItem = ({ item }) => {
    const esAsignacion = item.tipoAccion === 'Asignar';
    
    return (
      <View style={styles.card}>
        <View style={[styles.indicator, { backgroundColor: esAsignacion ? '#097678' : '#E67E22' }]} />
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{item.nombreInsumo}</Text>
            <Text style={styles.cantidad}>{item.cantidadAfectada} unid.</Text>
          </View>
          
          <Text style={styles.subText}>Color: {item.color || 'N/A'}</Text>
          
          <View style={styles.destRow}>
            <Icon name={esAsignacion ? "truck-delivery" : "office-building"} size={16} color="#666" />
            <Text style={styles.destText}> {item.destino}</Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.dateText}>
              {item.fecha?.toDate ? item.fecha.toDate().toLocaleString() : 'Reciente'}
            </Text>
            <Text style={styles.stockLabel}>Stock final: {item.stockResultante}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#097678" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.mainTitle}>Historial de Movimientos</Text>
        <Text style={styles.subtitle}>Rastreo de entradas y salidas de insumos</Text>
      </View>

      <FlatList
        data={historial}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay movimientos registrados aún.</Text>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#EEE' },
  mainTitle: { fontSize: 22, fontWeight: 'bold', color: '#097678' },
  subtitle: { fontSize: 14, color: '#666' },
  card: { 
    backgroundColor: '#FFF', borderRadius: 10, marginBottom: 12, 
    flexDirection: 'row', elevation: 2, overflow: 'hidden' 
  },
  indicator: { width: 6 },
  content: { flex: 1, padding: 15 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: 'bold', color: '#2D3436' },
  cantidad: { fontSize: 16, fontWeight: 'bold', color: '#097678' },
  subText: { fontSize: 13, color: '#666', marginVertical: 2 },
  destRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  destText: { fontSize: 13, color: '#2D3436', fontStyle: 'italic' },
  footer: { 
    flexDirection: 'row', justifyContent: 'space-between', 
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0' 
  },
  dateText: { fontSize: 11, color: '#999' },
  stockLabel: { fontSize: 11, color: '#999', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999' }
});

export default HistorialInventarioScreen;