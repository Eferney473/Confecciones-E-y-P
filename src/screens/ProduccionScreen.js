import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, 
  Alert, Modal, TextInput, ProgressBarAndroid 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';

const ProduccionScreen = () => {
  const [remisiones, setRemisiones] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [seleccionada, setSeleccionada] = useState(null);
  const [cantidadReportada, setCantidadReportada] = useState('');

  // 1. Cargar remisiones con estado "En Proceso"
  useEffect(() => {
    const subscriber = firestore()
      .collection('remisiones')
      .where('estado', '==', 'En Proceso')
      .onSnapshot(querySnapshot => {
        const data = [];
        querySnapshot?.forEach(doc => {
          data.push({ ...doc.data(), id: doc.id });
        });
        setRemisiones(data);
      });
    return () => subscriber();
  }, []);

  // 2. Lógica para actualizar el progreso
  const reportarProgreso = async () => {
    const reportado = parseInt(cantidadReportada);
    if (!reportado || reportado <= 0) {
      Alert.alert("Error", "Ingresa una cantidad válida");
      return;
    }

    const nuevaCantidad = (seleccionada.completado || 0) + reportado;

    if (nuevaCantidad > seleccionada.total) {
      Alert.alert("Error", "La cantidad reportada supera el total de la remisión");
      return;
    }

    try {
      const estadoFinal = nuevaCantidad === seleccionada.total ? 'Terminado' : 'En Proceso';
      
      await firestore().collection('remisiones').doc(seleccionada.id).update({
        completado: nuevaCantidad,
        estado: estadoFinal,
        ultimaActualizacion: firestore.FieldValue.serverTimestamp()
      });

      Alert.alert("Éxito", "Producción reportada correctamente");
      setModalVisible(false);
      setCantidadReportada('');
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar la producción");
    }
  };

  const renderItem = ({ item }) => {
    const progreso = (item.completado || 0) / item.total;
    
    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => { setSeleccionada(item); setModalVisible(true); }}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.refText}>Ref: {item.referencia}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.estado}</Text>
          </View>
        </View>

        <Text style={styles.detalleText}>Lote: {item.lote}</Text>
        
        <View style={styles.progressSection}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressLabel}>Progreso</Text>
            <Text style={styles.progressPercent}>{Math.round(progreso * 100)}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progreso * 100}%` }]} />
          </View>
          <Text style={styles.qtyText}>{item.completado || 0} / {item.total} fajas</Text>
        </View>

        <View style={styles.reportBtn}>
          <Icon name="plus-circle-outline" size={20} color="#097678" />
          <Text style={styles.reportBtnText}>REPORTAR AVANCE</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={remisiones}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={<Text style={styles.empty}>No hay remisiones activas asignadas.</Text>}
      />

      <Modal visible={modalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reportar Trabajo</Text>
            <Text style={styles.modalSubtitle}>
              Referencia: {seleccionada?.referencia}
            </Text>
            
            <TextInput 
              placeholder="¿Cuántas terminaste hoy?" 
              style={styles.input} 
              keyboardType="numeric"
              value={cantidadReportada}
              onChangeText={setCantidadReportada}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={reportarProgreso}>
                <Text style={styles.btnSaveText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 15, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  refText: { fontSize: 18, fontWeight: 'bold', color: '#2D3436' },
  statusBadge: { backgroundColor: '#EFFFFD', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5 },
  statusText: { color: '#097678', fontSize: 12, fontWeight: 'bold' },
  detalleText: { color: '#666', marginBottom: 15 },
  progressSection: { marginBottom: 15 },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  progressLabel: { fontSize: 12, color: '#999' },
  progressPercent: { fontSize: 12, fontWeight: 'bold', color: '#097678' },
  progressBarBg: { height: 8, backgroundColor: '#EEE', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#097678' },
  qtyText: { textAlign: 'right', fontSize: 12, color: '#666', marginTop: 5 },
  reportBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  reportBtnText: { color: '#097678', fontWeight: 'bold', marginLeft: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 25 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 15, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2D3436', marginBottom: 5 },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  input: { backgroundColor: '#F9F9F9', borderSize: 1, borderColor: '#DDD', borderRadius: 10, padding: 15, fontSize: 18, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
  btnCancel: { padding: 12, marginRight: 10 },
  btnCancelText: { color: '#999', fontWeight: 'bold' },
  btnSave: { backgroundColor: '#097678', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8 },
  btnSaveText: { color: '#FFF', fontWeight: 'bold' },
  empty: { textAlign: 'center', marginTop: 50, color: '#999' }
});

export default ProduccionScreen;