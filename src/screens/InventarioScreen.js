import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, 
  Alert, Modal, TextInput, ActivityIndicator 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';

const InventarioScreen = () => {
  const [insumos, setInsumos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Estado para el formulario
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({ nombre: '', color: '', cantidad: '' });

  // 1. ESCUCHA EN TIEMPO REAL
  useEffect(() => {
    const subscriber = firestore()
      .collection('inventario')
      .orderBy('nombre', 'asc')
      .onSnapshot(querySnapshot => {
        const data = [];
        querySnapshot?.forEach(doc => {
          data.push({ ...doc.data(), id: doc.id });
        });
        setInsumos(data);
        setLoading(false);
      }, error => {
        console.error("Error Firestore:", error);
        setLoading(false);
      });

    return () => subscriber();
  }, []);

  // 2. LÓGICA DE GUARDADO (CREAR O EDITAR)
  const guardarInsumo = async () => {
    const { nombre, cantidad, color } = form;
    
    if (!nombre || !cantidad) {
      Alert.alert("Error", "El nombre y la cantidad son obligatorios");
      return;
    }

    const datos = {
      nombre: nombre.trim(),
      color: color.trim(),
      cantidad: parseInt(cantidad),
      ultimaActualizacion: firestore.FieldValue.serverTimestamp()
    };

    try {
      if (editandoId) {
        await firestore().collection('inventario').doc(editandoId).update(datos);
      } else {
        await firestore().collection('inventario').add(datos);
      }
      cerrarModal();
    } catch (error) {
      Alert.alert("Error", "No se pudo procesar la solicitud");
    }
  };

  // 3. LÓGICA DE ELIMINACIÓN
  const eliminarInsumo = (id, nombre) => {
    Alert.alert(
      "Confirmar Eliminación",
      `¿Deseas eliminar "${nombre}" del inventario?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive", 
          onPress: async () => {
            try {
              await firestore().collection('inventario').doc(id).delete();
            } catch (error) {
              Alert.alert("Error", "No se pudo eliminar el registro");
            }
          } 
        }
      ]
    );
  };

  // 4. PREPARAR EDICIÓN
  const prepararEdicion = (item) => {
    setEditandoId(item.id);
    setForm({ 
      nombre: item.nombre, 
      color: item.color || '', 
      cantidad: item.cantidad.toString() 
    });
    setModalVisible(true);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setEditandoId(null);
    setForm({ nombre: '', color: '', cantidad: '' });
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.infoCol}>
          <Text style={styles.insumoNombre}>{item.nombre}</Text>
          <Text style={styles.insumoSubtitle}>Color: {item.color || 'N/A'}</Text>
        </View>
        <View style={styles.qtyContainer}>
          <Text style={styles.insumoCantidad}>{item.cantidad}</Text>
          <Text style={styles.qtyLabel}>Unid.</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert("Próximamente", "Asignar a remisión")}>
          <Icon name="link-variant" size={18} color="#097678" />
          <Text style={styles.actionText}>Asignar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert("Próximamente", "Devolver a proveedor")}>
          <Icon name="reply" size={18} color="#666" />
          <Text style={styles.actionText}>Devolver</Text>
        </TouchableOpacity>

        <View style={styles.rightActions}>
          <TouchableOpacity style={styles.miniBtn} onPress={() => prepararEdicion(item)}>
            <Icon name="pencil" size={20} color="#097678" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.miniBtn} onPress={() => eliminarInsumo(item.id, item.nombre)}>
            <Icon name="trash-can" size={20} color="#E17055" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#097678" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={insumos}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay insumos registrados</Text>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Icon name="plus" size={30} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editandoId ? 'Editar Insumo' : 'Nuevo Insumo'}
            </Text>
            
            <TextInput 
              placeholder="Nombre (ej. Hilo Negro)" 
              placeholderTextColor= '#666'
              color= '#000'
              style={styles.input} 
              value={form.nombre}
              onChangeText={t => setForm({...form, nombre: t})}
            />
            <TextInput 
              placeholder="Color" 
              placeholderTextColor= '#666'
              color= '#000'
              style={styles.input} 
              value={form.color}
              onChangeText={t => setForm({...form, color: t})}
            />
            <TextInput 
              placeholder="Cantidad" 
              placeholderTextColor= '#666'
              color= '#000'
              keyboardType="numeric" 
              style={styles.input} 
              value={form.cantidad}
              onChangeText={t => setForm({...form, cantidad: t})}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={cerrarModal}>
                <Text style={styles.btnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={guardarInsumo}>
                <Text style={styles.btnText}>Guardar</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { 
    backgroundColor: '#FFF', borderRadius: 12, padding: 16, 
    marginBottom: 12, elevation: 3, shadowColor: '#000', 
    shadowOpacity: 0.1, shadowRadius: 4 
  },
  cardHeader: { 
    flexDirection: 'row', justifyContent: 'space-between', 
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 12 
  },
  infoCol: { flex: 1 },
  insumoNombre: { fontSize: 18, fontWeight: 'bold', color: '#2D3436' },
  insumoSubtitle: { fontSize: 14, color: '#666', marginTop: 2 },
  qtyContainer: { alignItems: 'center', backgroundColor: '#EFFFFD', padding: 8, borderRadius: 8, minWidth: 60 },
  insumoCantidad: { fontSize: 20, fontWeight: 'bold', color: '#097678' },
  qtyLabel: { fontSize: 10, color: '#097678', textTransform: 'uppercase' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 15 },
  actionText: { marginLeft: 4, fontSize: 13, color: '#666' },
  rightActions: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
  miniBtn: { padding: 8, marginLeft: 10 },
  fab: { 
    position: 'absolute', bottom: 25, right: 25, 
    backgroundColor: '#097678', width: 56, height: 56, 
    borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 5 
  },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#097678' },
  input: { backgroundColor: '#F9F9F9', borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#EEE' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  btn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, marginLeft: 10 },
  btnCancel: { backgroundColor: '#F0F0F0' },
  btnSave: { backgroundColor: '#097678' },
  btnText: { fontWeight: 'bold', color: '#FFF' },
  btnCancelText: { color: '#666' }
});

export default InventarioScreen;