import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, 
  ActivityIndicator, Modal, Alert, ScrollView 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';

const ProduccionScreen = () => {
  const [tareas, setTareas] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalMaquinas, setModalMaquinas] = useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null);

  useEffect(() => {
    // 1. Escuchar remisiones en espera o proceso
    const subscriber = firestore()
      .collection('remisiones')
      .where('estadoProduccion', 'in', ['Pendiente', 'En Proceso'])
      .onSnapshot(querySnapshot => {
        const data = [];
        querySnapshot?.forEach(doc => data.push({ ...doc.data(), id: doc.id }));
        setTareas(data);
        setLoading(false);
      });

    // 2. Traer máquinas disponibles de la colección 'maquinas'
    const subMaquinas = firestore()
      .collection('maquinas')
      .onSnapshot(snap => {
        const m = [];
        snap?.forEach(doc => m.push({ ...doc.data(), id: doc.id }));
        setMaquinas(m);
      });

    return () => { subscriber(); subMaquinas(); };
  }, []);

  const asignarMaquina = async (nombreMaquina) => {
    if (!tareaSeleccionada) return;

    try {
      await firestore().collection('remisiones').doc(tareaSeleccionada.id).update({
        maquinaActual: nombreMaquina,
        estadoProduccion: 'En Proceso' // Cambio de estado automático
      });
      setModalMaquinas(false);
      Alert.alert("Éxito", `Tarea asignada a ${nombreMaquina}`);
    } catch (error) {
      Alert.alert("Error", "No se pudo asignar la máquina");
    }
  };

  const finalizarTarea = (id) => {
    Alert.alert("Finalizar", "¿Confirmas que la producción está terminada?", [
      { text: "No" },
      { 
        text: "Sí, Finalizar", 
        onPress: () => firestore().collection('remisiones').doc(id).update({ estadoProduccion: 'Terminado' }) 
      }
    ]);
  };

  const renderItem = ({ item }) => {
    // Color dinámico según el estado
    const statusColor = item.estadoProduccion === 'En Proceso' ? '#3498db' : '#f1c40f';

    return (
      <View style={styles.card}>
        <View style={[styles.statusHeader, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>● {item.estadoProduccion?.toUpperCase()}</Text>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.clienteName}>{item.cliente}</Text>
              <Text style={styles.refText}>
                Ref: {item.referencias?.[0]?.ref || 'Varios'} | #{item.numero}
              </Text>
            </View>
            <Text style={styles.qtyText}>{item.totalPrendas || 0} unds</Text>
          </View>
          
          <View style={styles.machineBox}>
            <Icon name="engine" size={20} color="#097678" />
            <Text style={styles.machineText}>
              Máquina: <Text style={{ fontWeight: 'bold' }}>{item.maquinaActual || 'No asignada'}</Text>
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={() => { setTareaSeleccionada(item); setModalMaquinas(true); }}
            >
              <Icon name="swap-horizontal" size={24} color="#3498db" />
              <Text style={styles.actionLabel}>Asignar Máquina</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionBtn}
              onPress={() => finalizarTarea(item.id)}
            >
              <Icon name="check-circle" size={24} color="#27ae60" />
              <Text style={styles.actionLabel}>Terminar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Panel de Producción</Text>
      <Text style={styles.subtitle}>Gestión de procesos en taller</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#097678" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={tareas}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No hay tareas pendientes</Text>}
        />
      )}

      {/* Modal para seleccionar máquina */}
      <Modal visible={modalMaquinas} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar Máquina</Text>
            <ScrollView>
              {maquinas.map((m, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.maquinaItem}
                  onPress={() => asignarMaquina(m.nombre)}
                >
                  <Icon name="engine" size={20} color="#666" />
                  <Text style={styles.maquinaItemText}>{m.nombre}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={styles.btnCerrar} 
              onPress={() => setModalMaquinas(false)}
            >
              <Text style={styles.btnCerrarText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#097678', marginLeft: 20, marginTop: 20 },
  subtitle: { fontSize: 14, color: '#666', marginLeft: 20, marginBottom: 10 },
  card: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 15, elevation: 3, overflow: 'hidden', marginHorizontal: 5 },
  statusHeader: { padding: 6, alignItems: 'center' },
  statusText: { color: '#FFF', fontWeight: 'bold', fontSize: 11 },
  cardBody: { padding: 15 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clienteName: { fontSize: 18, fontWeight: 'bold', color: '#2D3436' },
  refText: { fontSize: 13, color: '#666' },
  qtyText: { fontSize: 20, fontWeight: 'bold', color: '#097678' },
  machineBox: { flexDirection: 'row', backgroundColor: '#EBF5F5', padding: 12, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  machineText: { marginLeft: 10, color: '#2D3436' },
  actions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 15, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 10 },
  actionBtn: { alignItems: 'center', flex: 1 },
  actionLabel: { fontSize: 12, color: '#666', marginTop: 4, fontWeight: '500' },
  // Estilos Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', width: '80%', borderRadius: 15, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#097678' },
  maquinaItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#EEE', alignItems: 'center' },
  maquinaItemText: { marginLeft: 15, fontSize: 16, color: '#333' },
  btnCerrar: { marginTop: 15, padding: 10, alignItems: 'center' },
  btnCerrarText: { color: '#E17055', fontWeight: 'bold' }
});

export default ProduccionScreen;