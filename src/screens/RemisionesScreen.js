import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, 
  Alert, Modal, TextInput, ScrollView 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth'; // Necesario para identificar al usuario
import { SafeAreaView } from 'react-native-safe-area-context';

const RemisionesScreen = () => {
  const [remisiones, setRemisiones] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [userRole, setUserRole] = useState('operario'); // Por defecto restringido
  
  const [form, setForm] = useState({
    numero: '',
    cliente: 'BodyLine',
    estadoPago: 'Por Cobrar',
    referencias: []
  });

  // 1. CARGA DE DATOS, BUSCADOR Y ROL
  useEffect(() => {
    // Obtener rol del usuario actual
    const fetchUserRole = async () => {
      const user = auth().currentUser;
      if (user) {
        const userDoc = await firestore().collection('usuarios').where('email', '==', user.email).get();
        if (!userDoc.empty) {
          setUserRole(userDoc.docs[0].data().rol);
        }
      }
    };

    fetchUserRole();

    const subscriber = firestore()
      .collection('remisiones')
      .onSnapshot(querySnapshot => {
        const data = [];
        querySnapshot?.forEach(doc => data.push({ ...doc.data(), id: doc.id }));
        setRemisiones(data);
      });
    return () => subscriber();
  }, []);

  const remisionesFiltradas = remisiones.filter(r => 
    r.numero.includes(busqueda) || r.cliente.toLowerCase().includes(busqueda.toLowerCase())
  );

  const togglePago = async (id, estadoActual) => {
    if (userRole === 'operario') return; // Seguridad extra
    const nuevoEstado = estadoActual === 'Pagada' ? 'Por Cobrar' : 'Pagada';
    await firestore().collection('remisiones').doc(id).update({ estadoPago: nuevoEstado });
  };

  const agregarReferenciaVacia = () => {
    setForm({
      ...form,
      referencias: [...form.referencias, { 
        id: Date.now(), 
        ref: '', 
        color: '', 
        tallas: '', 
        cantidad: '', 
        valorUnitario: '', 
        valorTotal: 0 
      }]
    });
  };

  const guardarRemision = async () => {
    if (!form.numero || form.referencias.length === 0) {
      Alert.alert("Error", "Completa el número y añade al menos una referencia");
      return;
    }
    
    // Calcular el gran total de la remisión antes de guardar
    const totalRemision = form.referencias.reduce((acc, curr) => acc + (parseFloat(curr.valorTotal) || 0), 0);

    await firestore().collection('remisiones').add({
      ...form,
      totalGeneral: totalRemision,
      fechaCreacion: firestore.FieldValue.serverTimestamp()
    });
    setModalVisible(false);
    setForm({ numero: '', cliente: 'BodyLine', estadoPago: 'Por Cobrar', referencias: [] });
  };

  // Función para actualizar campos de referencia y calcular total automáticamente
  const updateRefField = (index, field, value) => {
    let newRefs = [...form.referencias];
    newRefs[index][field] = value;

    // Si cambia cantidad o valor unitario, recalcular valorTotal
    if (field === 'cantidad' || field === 'valorUnitario') {
      const cant = parseFloat(newRefs[index].cantidad) || 0;
      const price = parseFloat(newRefs[index].valorUnitario) || 0;
      newRefs[index].valorTotal = cant * price;
    }
    setForm({...form, referencias: newRefs});
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.remNum}>Remisión #{item.numero}</Text>
        
        {/* RESTRICCIÓN: Solo visible para gerentes/taller */}
        {userRole !== 'operario' && (
          <TouchableOpacity 
            style={[styles.badge, { backgroundColor: item.estadoPago === 'Pagada' ? '#A2D9CE' : '#FFDADA' }]}
            onPress={() => togglePago(item.id, item.estadoPago)}
          >
            <Text style={styles.badgeText}>{item.estadoPago}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.clienteLabel}>Cliente: {item.cliente}</Text>

      {item.referencias.map((r, index) => (
        <View key={index} style={styles.refRow}>
          <Text style={styles.refInfo}>Ref: {r.ref} | Cant: {r.cantidad} | Tallas: {r.tallas}</Text>
          {userRole !== 'operario' && (
            <Text style={styles.priceInfo}>Subtotal: ${parseFloat(r.valorTotal || 0).toLocaleString()}</Text>
          )}
        </View>
      ))}

      {userRole !== 'operario' && (
        <Text style={styles.totalGeneral}>Total: ${parseFloat(item.totalGeneral || 0).toLocaleString()}</Text>
      )}

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn}>
          <Icon name="truck-partially-delivered" size={20} color="#097678" />
          <Text style={styles.actionText}>Parciales</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity style={styles.iconBtn}><Icon name="pencil" size={20} color="#666" /></TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}><Icon name="trash-can" size={20} color="#E17055" /></TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Icon name="magnify" size={24} color="#666" />
        <TextInput 
          placeholder="Buscar por número o cliente..." 
          placeholderTextColor='#666'
          color='#000'
          style={styles.searchInput}
          onChangeText={setBusqueda}
        />
      </View>

      <FlatList 
        data={remisionesFiltradas}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 15 }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Icon name="plus" size={30} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nueva Remisión</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Icon name="close" size={28} /></TouchableOpacity>
          </View>
          
          <ScrollView style={{ padding: 20 }}>
            <TextInput placeholder="Número de Remisión" placeholderTextColor='#666' color='#000' style={styles.input} onChangeText={t => setForm({...form, numero: t})} />
            <TextInput placeholder="Cliente" placeholderTextColor='#666' color='#000' style={styles.input} value={form.cliente} onChangeText={t => setForm({...form, cliente: t})} />
            
            <Text style={styles.sectionTitle}>Referencias</Text>
            {form.referencias.map((r, i) => (
              <View key={r.id} style={styles.refForm}>
                <TextInput placeholder="Referencia" placeholderTextColor='#666' color='#000' style={styles.inputSmall} onChangeText={t => updateRefField(i, 'ref', t)} />
                <TextInput placeholder="Tallas (ej: S, M, L)" placeholderTextColor='#666' color='#000' style={styles.inputSmall} onChangeText={t => updateRefField(i, 'tallas', t)} />
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <TextInput placeholder="Color" placeholderTextColor='#666' color='#000' style={[styles.inputSmall, {width: '30%'}]} onChangeText={t => updateRefField(i, 'color', t)} />
                  <TextInput placeholder="Cantidad" placeholderTextColor='#666' color='#000' keyboardType="numeric" style={[styles.inputSmall, {width: '30%'}]} onChangeText={t => updateRefField(i, 'cantidad', t)} />
                  <TextInput placeholder="Valor Unit." placeholderTextColor='#666' color='#000' keyboardType="numeric" style={[styles.inputSmall, {width: '30%'}]} onChangeText={t => updateRefField(i, 'valorUnitario', t)} />
                </View>
                
                <Text style={styles.subtotalPreview}>Subtotal Ref: ${ (r.valorTotal || 0).toLocaleString() }</Text>
              </View>
            ))}

            <TouchableOpacity style={styles.btnAddRef} onPress={agregarReferenciaVacia}>
              <Icon name="plus-circle" size={20} color="#097678" />
              <Text style={styles.btnAddRefText}>Añadir Referencia</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnSave} onPress={guardarRemision}>
              <Text style={styles.btnSaveText}>GUARDAR REMISIÓN</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  searchBar: { flexDirection: 'row', backgroundColor: '#FFF', margin: 15, paddingHorizontal: 15, borderRadius: 10, alignItems: 'center', elevation: 2 },
  searchInput: { flex: 1, height: 50, marginLeft: 10 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  remNum: { fontSize: 18, fontWeight: 'bold', color: '#097678' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 5 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  clienteLabel: { fontSize: 14, color: '#666', marginBottom: 10 },
  refRow: { backgroundColor: '#F9F9F9', padding: 8, borderRadius: 5, marginBottom: 5 },
  refInfo: { fontSize: 13, color: '#333' },
  priceInfo: { fontSize: 11, color: '#097678', fontWeight: 'bold', marginTop: 2 },
  totalGeneral: { textAlign: 'right', fontSize: 16, fontWeight: 'bold', color: '#2D3436', marginTop: 10 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center' },
  actionText: { marginLeft: 5, color: '#097678', fontWeight: 'bold' },
  iconBtn: { marginLeft: 15 },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#097678', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  input: { borderSize: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, marginBottom: 15, backgroundColor: '#FFF' },
  refForm: { borderLeftWidth: 3, borderLeftColor: '#097678', paddingLeft: 10, marginBottom: 15, backgroundColor: '#fdfdfd', padding: 10 },
  inputSmall: { borderBottomWidth: 1, borderBottomColor: '#DDD', marginBottom: 10, padding: 5 },
  subtotalPreview: { fontSize: 12, color: '#097678', textAlign: 'right', fontWeight: 'bold' },
  btnAddRef: { flexDirection: 'row', alignItems: 'center', marginBottom: 30, marginTop: 10 },
  btnAddRefText: { color: '#097678', marginLeft: 10, fontWeight: 'bold' },
  btnSave: { backgroundColor: '#097678', padding: 18, borderRadius: 10, alignItems: 'center', marginBottom: 50 },
  btnSaveText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginVertical: 15, color: '#333' }
});

export default RemisionesScreen;