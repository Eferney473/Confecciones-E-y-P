import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, 
  ActivityIndicator, Modal, Alert, ScrollView 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const ProduccionScreen = ({ navigation }) => {
  const [tareas, setTareas] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalMaquinas, setModalMaquinas] = useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null);

  useEffect(() => {
    // Ahora solo escuchamos lo que realmente está en fabricación
    const subscriber = firestore()
      .collection('remisiones')
      .where('estadoProduccion', 'in', ['Pendiente', 'En Proceso', 'StandBy'])
      .onSnapshot(querySnapshot => {
        const data = [];
        querySnapshot?.forEach(doc => data.push({ ...doc.data(), id: doc.id }));
        data.sort((a, b) => (b.fechaCreacion?.seconds || 0) - (a.fechaCreacion?.seconds || 0));
        setTareas(data);
        setLoading(false);
      }, error => {
        setLoading(false);
      });

    const subMaquinas = firestore()
      .collection('maquinas')
      .onSnapshot(snap => {
        const m = [];
        snap?.forEach(doc => m.push({ ...doc.data(), id: doc.id }));
        setMaquinas(m);
      });

    return () => { subscriber(); subMaquinas(); };
  }, []);

  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      await firestore().collection('remisiones').doc(id).update({
        estadoProduccion: nuevoEstado
      });
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar el proceso");
    }
  };

  const asignarMaquina = async (nombreMaquina) => {
    if (!tareaSeleccionada) return;
    try {
      await firestore().collection('remisiones').doc(tareaSeleccionada.id).update({
        maquinaActual: nombreMaquina,
        estadoProduccion: 'En Proceso'
      });
      setModalMaquinas(false);
    } catch (error) {
      Alert.alert("Error", "No se pudo asignar");
    }
  };

  // --- FUNCIÓN FINAL: TERMINA Y ENVÍA AL HISTORIAL DE UNA VEZ ---
  const finalizarYEntregarDirecto = (item) => {
    Alert.alert("Finalizar Pedido", `¿Confirmas que la producción de #${item.numero} terminó y se entrega al cliente?`, [
      { text: "Cancelar", style: "cancel" },
      { 
        text: "Sí, Terminar y Entregar", 
        onPress: async () => {
          try {
            const batch = firestore().batch();
            const remisionRef = firestore().collection('remisiones').doc(item.id);
            const historialRef = firestore().collection('historial_entregas').doc();

            // 1. Desaparece de producción
            batch.update(remisionRef, { 
              estadoProduccion: 'Entregado',
              fechaFinalizado: firestore.FieldValue.serverTimestamp()
            });

            // 2. Aparece en el historial de entregas
            batch.set(historialRef, {
              remisionId: item.id,
              numero: item.numero,
              cliente: item.cliente,
              unidades: item.totalPrendas || 0,
              totalGeneral: item.totalGeneral || 0,
              detalleReferencias: item.referencias || [],
              insumosUtilizados: item.insumos || [],
              entregadoPor: auth().currentUser?.email || 'Admin',
              fechaEntrega: firestore.FieldValue.serverTimestamp(),
              estadoPago: item.estadoPago || 'Pendiente'
            });

            await batch.commit();
            Alert.alert("Éxito", "Pedido entregado. Revisa el historial para gestionar el cobro.");
          } catch (e) {
            Alert.alert("Error", "Hubo un problema al procesar la entrega.");
          }
        } 
      }
    ]);
  };

  const renderItem = ({ item }) => {
    const statusConfig = {
      'Pendiente': { color: '#f1c40f', icon: 'clock-outline' },
      'En Proceso': { color: '#3498db', icon: 'cog-sync' },
      'StandBy': { color: '#e67e22', icon: 'pause-circle' }
    };
    const config = statusConfig[item.estadoProduccion] || { color: '#95a5a6', icon: 'help' };

    return (
      <View style={styles.card}>
        <View style={[styles.statusHeader, { backgroundColor: config.color }]}>
          <Text style={styles.statusText}>
            <Icon name={config.icon} size={14} color="#FFF" /> {item.estadoProduccion?.toUpperCase()}
          </Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.clienteName}>{item.cliente}</Text>
              <Text style={styles.remisionNum}>Remisión #{item.numero}</Text>
            </View>
            <View style={styles.totalBadge}>
              <Text style={styles.qtyText}>{item.totalPrendas || 0}</Text>
              <Text style={styles.qtyLabel}>prendas</Text>
            </View>
          </View>

          <View style={styles.detallesBox}>
            <Text style={styles.detallesTitle}>Detalle de Prendas:</Text>
            {item.referencias?.map((ref, idx) => (
              <View key={idx} style={styles.refItemRow}>
                <Text style={styles.refTextMain}>• {ref.ref} - {ref.color}</Text>
                <Text style={styles.refTextCant}>{ref.cantidad} unds</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.machineBox}>
            <Icon name="engine" size={18} color="#097678" />
            <Text style={styles.machineText}>
              Máquina: <Text style={{ fontWeight: 'bold' }}>{item.maquinaActual || 'No asignada'}</Text>
            </Text>
          </View>

          <View style={styles.actions}>
            {item.estadoProduccion !== 'StandBy' ? (
              <TouchableOpacity style={styles.actionBtn} onPress={() => cambiarEstado(item.id, 'StandBy')}>
                <Icon name="pause-circle-outline" size={24} color="#e67e22" />
                <Text style={styles.actionLabel}>Pausar</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.actionBtn} onPress={() => cambiarEstado(item.id, 'En Proceso')}>
                <Icon name="play-circle-outline" size={24} color="#3498db" />
                <Text style={styles.actionLabel}>Reanudar</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={() => { setTareaSeleccionada(item); setModalMaquinas(true); }}
            >
              <Icon name="swap-horizontal" size={24} color="#097678" />
              <Text style={styles.actionLabel}>Máquina</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={() => finalizarYEntregarDirecto(item)}>
              <Icon name="check-circle" size={24} color="#27ae60" />
              <Text style={[styles.actionLabel, {color: '#27ae60', fontWeight: 'bold'}]}>TERMINAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Producción Activa</Text>
          <Text style={styles.subtitle}>Gestión de procesos en taller</Text>
        </View>
        
        {/* Botón de Historial de Entregas (Navegación al historial) */}
        <TouchableOpacity 
          style={styles.historyBtn} 
          onPress={() => navigation.navigate('HistorialEntregas')}
        >
          <Icon name="history" size={28} color="#097678" />
          <Text style={styles.historyLabel}>Entregas</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color="#097678" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={tareas}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No hay procesos activos en este momento</Text>}
        />
      )}

      {/* Modal Máquinas */}
      <Modal visible={modalMaquinas} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Asignar Máquina</Text>
            <ScrollView>
              {maquinas.map((m, index) => (
                <TouchableOpacity key={index} style={styles.maquinaItem} onPress={() => asignarMaquina(m.nombre)}>
                  <Icon name="engine" size={20} color="#666" />
                  <Text style={styles.maquinaItemText}>{m.nombre}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.btnCerrar} onPress={() => setModalMaquinas(false)}>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 20, marginBottom: 10 },
  historyBtn: { alignItems: 'center', backgroundColor: '#FFF', padding: 8, borderRadius: 12, elevation: 2 },
  historyLabel: { fontSize: 10, color: '#097678', fontWeight: 'bold' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#097678' },
  subtitle: { fontSize: 13, color: '#666' },
  card: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 15, elevation: 3, overflow: 'hidden', marginHorizontal: 5 },
  statusHeader: { padding: 6, alignItems: 'center' },
  statusText: { color: '#FFF', fontWeight: 'bold', fontSize: 11 },
  cardBody: { padding: 15 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  clienteName: { fontSize: 18, fontWeight: 'bold', color: '#2D3436' },
  remisionNum: { fontSize: 13, color: '#097678', fontWeight: '600' },
  totalBadge: { alignItems: 'center', backgroundColor: '#EBF5F5', padding: 8, borderRadius: 10, minWidth: 60 },
  qtyText: { fontSize: 18, fontWeight: 'bold', color: '#097678' },
  qtyLabel: { fontSize: 9, color: '#666', marginTop: -2 },
  detallesBox: { marginTop: 12, padding: 10, backgroundColor: '#F9F9F9', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#097678' },
  detallesTitle: { fontSize: 11, fontWeight: 'bold', color: '#7f8c8d', marginBottom: 5 },
  refItemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  refTextMain: { fontSize: 13, color: '#2d3436' },
  refTextCant: { fontSize: 13, fontWeight: 'bold', color: '#2d3436' },
  machineBox: { flexDirection: 'row', backgroundColor: '#F0F2F2', padding: 10, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  machineText: { marginLeft: 10, fontSize: 13, color: '#2D3436' },
  actions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 15, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 12, alignItems: 'center' },
  actionBtn: { alignItems: 'center', flex: 1 },
  actionLabel: { fontSize: 11, color: '#666', marginTop: 4, fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#95a5a6' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', width: '85%', borderRadius: 15, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#097678' },
  maquinaItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#EEE', alignItems: 'center' },
  maquinaItemText: { marginLeft: 15, fontSize: 16, color: '#333' },
  btnCerrar: { marginTop: 15, padding: 10, alignItems: 'center' },
  btnCerrarText: { color: '#E17055', fontWeight: 'bold' }
});

export default ProduccionScreen;