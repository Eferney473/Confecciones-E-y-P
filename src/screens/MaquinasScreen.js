import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, 
  Alert, Modal, TextInput, ScrollView 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';

const MaquinasScreen = () => {
  const [maquinas, setMaquinas] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  
  const [form, setForm] = useState({
    nombre: '',
    marca: '',
    serial: '',
    estado: 'Operativa',
    ultimoMantenimiento: '',
    registroNotas: ''
  });

  // 1. CARGA DE MÁQUINAS
  useEffect(() => {
    const subscriber = firestore()
      .collection('maquinas')
      .onSnapshot(querySnapshot => {
        const data = [];
        querySnapshot?.forEach(doc => data.push({ ...doc.data(), id: doc.id }));
        setMaquinas(data);
      });
    return () => subscriber();
  }, []);

  // 2. LÓGICA DE GUARDADO
  const guardarMaquina = async () => {
    if (!form.nombre || !form.serial) {
      Alert.alert("Error", "El nombre y el serial son obligatorios");
      return;
    }

    try {
      if (editandoId) {
        await firestore().collection('maquinas').doc(editandoId).update(form);
      } else {
        await firestore().collection('maquinas').add({
          ...form,
          fechaIngreso: firestore.FieldValue.serverTimestamp()
        });
      }
      cerrarModal();
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar la máquina");
    }
  };

  // 3. ELIMINAR MÁQUINA
  const eliminarMaquina = (id) => {
    Alert.alert("Eliminar", "¿Seguro que deseas eliminar esta máquina?", [
      { text: "No" },
      { text: "Sí", onPress: () => firestore().collection('maquinas').doc(id).delete() }
    ]);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setEditandoId(null);
    setForm({ nombre: '', marca: '', serial: '', estado: 'Operativa', ultimoMantenimiento: '', registroNotas: '' });
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Operativa': return '#27AE60'; // Verde
      case 'Mantenimiento': return '#F1C40F'; // Amarillo
      case 'Falla': return '#E74C3C'; // Rojo
      default: return '#95A5A6';
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.maquinaTitle}>{item.nombre} - {item.marca}</Text>
          <Text style={styles.serialText}>S/N: {item.serial}</Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.estado) }]} />
      </View>

      <View style={styles.infoRow}>
        <Icon name="calendar-check" size={16} color="#666" />
        <Text style={styles.infoText}>Últ. Manto: {item.ultimoMantenimiento || 'Sin registro'}</Text>
      </View>

      <Text style={styles.notasLabel}>Notas de Mantenimiento:</Text>
      <Text style={styles.notasText}>{item.registroNotas || 'No hay observaciones'}</Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnAction} onPress={() => { setEditandoId(item.id); setForm(item); setModalVisible(true); }}>
          <Icon name="pencil-outline" size={20} color="#097678" />
          <Text style={[styles.btnActionText, { color: '#097678' }]}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnAction} onPress={() => eliminarMaquina(item.id)}>
          <Icon name="trash-can-outline" size={20} color="#E74C3C" />
          <Text style={[styles.btnActionText, { color: '#E74C3C' }]}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList 
        data={maquinas}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 15 }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Icon name="plus" size={30} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide">
        <ScrollView style={styles.modalScroll}>
          <Text style={styles.modalTitle}>{editandoId ? 'Editar Máquina' : 'Nueva Máquina'}</Text>
          
          <TextInput 
            placeholder="Nombre (ej. Plana)" 
            placeholderTextColor='#666'
            color='#000'
            style={styles.input} 
            value={form.nombre} 
            onChangeText={t => setForm({...form, nombre: t})}
           />
          <TextInput 
            placeholder="Marca (ej. Pegasus)" 
            placeholderTextColor='#666'
            color='#000'
            style={styles.input} 
            value={form.marca} 
            onChangeText={t => setForm({...form, marca: t})} 
        />
          <TextInput 
            placeholder="Serial (S/N)" 
            placeholderTextColor='#666'
            color='#000'
            style={styles.input} 
            value={form.serial} 
            onChangeText={t => setForm({...form, serial: t})} 
        />
          
          <Text style={styles.label}>Estado de Semáforo:</Text>
          <View style={styles.statusPicker}>
            {['Operativa', 'Mantenimiento', 'Falla'].map(s => (
              <TouchableOpacity 
                key={s} 
                style={[styles.statusOption, form.estado === s && { backgroundColor: getStatusColor(s) }]}
                onPress={() => setForm({...form, estado: s})}
              >
                <Text style={[styles.statusOptionText, form.estado === s && { color: '#FFF' }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput 
            placeholder="Fecha Últ. Mantenimiento (DD/MM/AAAA)" 
            placeholderTextColor='#666'
            color='#000'
            style={styles.input} 
            value={form.ultimoMantenimiento} 
            onChangeText={t => setForm({...form, ultimoMantenimiento: t})} 
          />
          <TextInput 
            placeholder="Notas de registro" 
            placeholderTextColor='#666'
            color='#000'
            style={[styles.input, { height: 80 }]} 
            multiline 
            value={form.registroNotas} 
            onChangeText={t => setForm({...form, registroNotas: t})} 
          />

          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.btnCancel} onPress={cerrarModal}><Text>Cancelar</Text></TouchableOpacity>
            <TouchableOpacity style={styles.btnSave} onPress={guardarMaquina}><Text style={{ color: '#FFF' }}>Guardar</Text></TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  maquinaTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3436' },
  serialText: { color: '#888', fontSize: 12 },
  statusDot: { width: 15, height: 15, borderRadius: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  infoText: { marginLeft: 5, color: '#666', fontSize: 14 },
  notasLabel: { fontSize: 12, fontWeight: 'bold', color: '#999', marginTop: 10 },
  notasText: { fontSize: 13, color: '#444', fontStyle: 'italic' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 10 },
  btnAction: { flexDirection: 'row', alignItems: 'center', marginLeft: 20 },
  btnActionText: { marginLeft: 5, fontWeight: 'bold' },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#097678', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  modalScroll: { padding: 25 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 25, color: '#097678' },
  input: { borderBottomWidth: 1, borderBottomColor: '#DDD', marginBottom: 20, padding: 8 },
  label: { fontSize: 14, color: '#666', marginBottom: 10 },
  statusPicker: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  statusOption: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#EEE' },
  statusOptionText: { fontSize: 12, color: '#666' },
  modalBtns: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 50 },
  btnSave: { backgroundColor: '#097678', padding: 15, borderRadius: 10, width: '48%', alignItems: 'center' },
  btnCancel: { backgroundColor: '#EEE', padding: 15, borderRadius: 10, width: '48%', alignItems: 'center' }
});

export default MaquinasScreen;