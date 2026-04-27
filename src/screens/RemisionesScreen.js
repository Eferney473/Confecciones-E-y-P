import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, 
  Alert, Modal, TextInput, ScrollView, SafeAreaView 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const RemisionesScreen = () => {
  // --- ESTADOS ---
  const [remisiones, setRemisiones] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [userRole, setUserRole] = useState('operario');
  const [editandoId, setEditandoId] = useState(null);
  
  const [form, setForm] = useState({
    numero: '',
    cliente: '',
    estadoPago: 'Por Cobrar',
    referencias: [],
    insumos: [] 
  });

  // --- LÓGICA DE DATOS Y ROL ---
  useEffect(() => {
    const fetchUserRole = async () => {
      const user = auth().currentUser;
      if (user && user.email) {
        const userDoc = await firestore().collection('usuarios')
          .where('email', '==', user.email.toLowerCase()).get();
        
        if (!userDoc.empty) {
          const rolRecuperado = userDoc.docs[0].data().rol;
          setUserRole(rolRecuperado);
        }
      }
    };

    fetchUserRole();

    const subscriber = firestore()
      .collection('remisiones')
      .orderBy('fechaCreacion', 'desc')
      .onSnapshot(querySnapshot => {
        const data = [];
        querySnapshot?.forEach(doc => data.push({ ...doc.data(), id: doc.id }));
        setRemisiones(data);
      });
    return () => subscriber();
  }, []);

  // --- BUSCADOR ---
  const remisionesFiltradas = remisiones.filter(r => 
    (r.numero && r.numero.includes(busqueda)) || 
    (r.cliente && r.cliente.toLowerCase().includes(busqueda.toLowerCase()))
  );

  // --- FUNCIONES DE ACCIÓN ---
  const togglePago = async (id, estadoActual) => {
    if (userRole !== 'gerente') return;
    const nuevoEstado = estadoActual === 'Pagada' ? 'Por Cobrar' : 'Pagada';
    await firestore().collection('remisiones').doc(id).update({ estadoPago: nuevoEstado });
  };

  const confirmarEliminar = (id) => {
    Alert.alert("Eliminar", "¿Deseas borrar esta remisión?", [
      { text: "No" },
      { text: "Sí", onPress: () => firestore().collection('remisiones').doc(id).delete() }
    ]);
  };

  // --- MANEJO DE REFERENCIAS ---
  const agregarReferenciaVacia = () => {
    setForm({
      ...form,
      referencias: [...form.referencias, { 
        id: Date.now(), ref: '', color: '', tallas: '', cantidad: '', valorUnitario: '', valorTotal: 0 
      }]
    });
  };

  const updateRefField = (index, field, value) => {
    let newRefs = [...form.referencias];
    newRefs[index][field] = value;
    
    // Cálculo automático de valor total por referencia
    if (field === 'cantidad' || field === 'valorUnitario') {
      const cant = parseFloat(newRefs[index].cantidad) || 0;
      const price = parseFloat(newRefs[index].valorUnitario) || 0;
      newRefs[index].valorTotal = cant * price;
    }
    setForm({...form, referencias: newRefs});
  };

  // --- MANEJO DE INSUMOS ---
  const agregarInsumoVacio = () => {
    setForm({
      ...form,
      insumos: [...form.insumos, { id: Date.now(), nombre: '', color: '', cantidad: '', unidad: '' }]
    });
  };

  const updateInsumoField = (index, field, value) => {
    let newInsumos = [...form.insumos];
    newInsumos[index][field] = value;
    setForm({...form, insumos: newInsumos});
  };

  const guardarRemision = async () => {
    if (!form.numero || form.referencias.length === 0) {
      Alert.alert("Error", "Completa el número y añade al menos una referencia");
      return;
    }
    
    // Calcula el total sumando el valorTotal de cada referencia
    const totalRemision = form.referencias.reduce((acc, curr) => acc + (parseFloat(curr.valorTotal) || 0), 0);
    
    const dataObj = {
      ...form,
      totalGeneral: totalRemision,
      fechaCreacion: firestore.FieldValue.serverTimestamp()
    };

    if (editandoId) {
      await firestore().collection('remisiones').doc(editandoId).update(dataObj);
    } else {
      await firestore().collection('remisiones').add(dataObj);
    }
    
    setModalVisible(false);
    setEditandoId(null);
    setForm({ numero: '', cliente: '', estadoPago: 'Por Cobrar', referencias: [], insumos: [] });
  };

  // --- RENDER DE TARJETA ---
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.clienteHeader}>{item.cliente}</Text>
          <Text style={styles.subLabel}>Remisión: #{item.numero}</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconAction}><Icon name="truck-delivery" size={24} color="#097678" /></TouchableOpacity>
          {userRole === 'gerente' && (
            <>
              <TouchableOpacity style={styles.iconAction} onPress={() => { setForm(item); setEditandoId(item.id); setModalVisible(true); }}>
                <Icon name="pencil" size={22} color="#097678" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconAction} onPress={() => confirmarEliminar(item.id)}>
                <Icon name="trash-can" size={22} color="#E17055" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionSubtitle}><Icon name="tshirt-crew" size={16} /> Prendas Pendientes:</Text>
      {/* Se renderizan todas las referencias asociadas */}
      {item.referencias?.map((r, index) => (
        <View key={index} style={[styles.rowItem, { marginBottom: 5 }]}>
          <View style={{ flex: 2 }}>
            <Text style={[styles.rowText, { fontWeight: 'bold' }]}>{r.ref}</Text>
            <Text style={styles.rowText}>{r.color || 'Sin color'}</Text>
          </View>
          <Text style={styles.rowTextCenter}>{r.tallas}</Text>
          <Text style={styles.rowTextBold}>{r.cantidad} unds</Text>
        </View>
      ))}

      <View style={styles.historialBox}>
        <Text style={styles.historialTitle}><Icon name="package-variant-closed" size={14} /> Historial de Despachos:</Text>
        <Text style={styles.historialText}>- No hay envíos registrados aún</Text>
      </View>

      <Text style={styles.sectionSubtitle}> Insumos Recibidos:</Text>
      {item.insumos?.length > 0 ? item.insumos.map((ins, i) => (
        <Text key={i} style={styles.insumoText}>• {ins.nombre}: {ins.cantidad} ({ins.unidad})</Text>
      )) : <Text style={styles.insumoText}>Ninguno</Text>}

      <View style={styles.cardFooter}>
        <Text style={styles.totalText}>Total: ${parseFloat(item.totalGeneral || 0).toLocaleString()}</Text>
        <TouchableOpacity 
          style={[styles.statusBadge, { backgroundColor: item.estadoPago === 'Pagada' ? '#2ecc71' : '#FFDADA' }]}
          onPress={() => togglePago(item.id, item.estadoPago)}
        >
          <Text style={[styles.statusText, { color: item.estadoPago === 'Pagada' ? '#FFF' : '#333' }]}>
            {item.estadoPago?.toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBar}>
        <Icon name="magnify" size={24} color="#666" />
        <TextInput 
          placeholder="Buscar cliente o referencia..." 
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
        contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => { setEditandoId(null); setForm({ numero: '', cliente: '', estadoPago: 'Por Cobrar', referencias: [], insumos: [] }); setModalVisible(true); }}>
        <Icon name="plus" size={30} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editandoId ? 'Editar Remisión' : 'Nueva Remisión'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Icon name="close" size={28} /></TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }}>
            <TextInput 
              placeholder="Número de Remisión" 
              placeholderTextColor='#666'
              color='#000'
              style={styles.input} 
              value={form.numero} 
              onChangeText={t => setForm({...form, numero: t})} 
            />
            <TextInput 
              placeholder="Cliente" 
              placeholderTextColor='#666'
              color='#000'
              style={styles.input} 
              value={form.cliente} 
              onChangeText={t => setForm({...form, cliente: t})} 
            />

            <Text style={styles.sectionTitle}>1. Curva de Tallas / Colores</Text>
            {form.referencias.map((r, i) => (
              <View key={r.id} style={styles.refForm}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                  <TextInput 
                    placeholder="Referencia" 
                    placeholderTextColor='#666'
                    color='#000'
                    style={[styles.inputSmall, {width: '45%'}]} 
                    value={r.ref} 
                    onChangeText={t => updateRefField(i, 'ref', t)} 
                  />
                  <TextInput 
                    placeholder="V. Unitario" 
                    placeholderTextColor='#666'
                    color='#000'
                    keyboardType="numeric"
                    style={[styles.inputSmall, {width: '45%'}]} 
                    value={r.valorUnitario.toString()} 
                    onChangeText={t => updateRefField(i, 'valorUnitario', t)} 
                  />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <TextInput 
                    placeholder="Color" 
                    placeholderTextColor='#666'
                    color='#000'
                    style={[styles.inputSmall, {width: '30%'}]} 
                    value={r.color} 
                    onChangeText={t => updateRefField(i, 'color', t)} 
                  />
                  <TextInput 
                    placeholder="Tallas" 
                    placeholderTextColor='#666'
                    color='#000'
                    style={[styles.inputSmall, {width: '30%'}]} 
                    value={r.tallas} 
                    onChangeText={t => updateRefField(i, 'tallas', t)} 
                  />
                  <TextInput 
                    placeholder="Cant" 
                    placeholderTextColor='#666'
                    color='#000'
                    keyboardType="numeric" 
                    style={[styles.inputSmall, {width: '30%'}]} 
                    value={r.cantidad.toString()} 
                    onChangeText={t => updateRefField(i, 'cantidad', t)} 
                  />
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.btnAddRef} onPress={agregarReferenciaVacia}>
              <Text style={styles.btnAddRefText}>+ Añadir Prenda</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>2. Insumos que llegan</Text>
            {form.insumos.map((ins, i) => (
              <View key={ins.id} style={styles.refForm}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <TextInput 
                    placeholder="Ej: Hilaza" 
                    placeholderTextColor='#666'
                    color='#000'
                    style={[styles.inputSmall, {width: '23%'}]} 
                    value={ins.nombre} 
                    onChangeText={t => updateInsumoField(i, 'nombre', t)} 
                  />
                  <TextInput 
                    placeholder="Color" 
                    placeholderTextColor='#666'
                    color='#000'
                    style={[styles.inputSmall, {width: '23%'}]} 
                    value={ins.color} 
                    onChangeText={t => updateInsumoField(i, 'color', t)} 
                  />
                  <TextInput 
                    placeholder="Cant" 
                    placeholderTextColor='#666'
                    color='#000'
                    keyboardType="numeric" 
                    style={[styles.inputSmall, {width: '23%'}]} 
                    value={ins.cantidad} 
                    onChangeText={t => updateInsumoField(i, 'cantidad', t)} 
                  />
                  <TextInput 
                    placeholder="Unid" 
                    placeholderTextColor='#666'
                    color='#000'
                    style={[styles.inputSmall, {width: '23%'}]} 
                    value={ins.unidad} 
                    onChangeText={t => updateInsumoField(i, 'unidad', t)} 
                  />
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.btnAddRef} onPress={agregarInsumoVacio}>
              <Text style={styles.btnAddRefText}>+ Añadir Insumo Detallado</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnSave} onPress={guardarRemision}>
              <Text style={styles.btnSaveText}>Guardar</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  searchBar: { flexDirection: 'row', backgroundColor: '#FFF', margin: 15, paddingHorizontal: 15, borderRadius: 10, alignItems: 'center', elevation: 2 },
  searchInput: { flex: 1, height: 50, marginLeft: 10, color: '#000' },
  card: { backgroundColor: '#FFF', borderRadius: 15, padding: 15, marginBottom: 20, elevation: 4, marginHorizontal: 15 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  clienteHeader: { fontSize: 20, fontWeight: 'bold', color: '#097678' },
  subLabel: { fontSize: 12, color: '#666' },
  headerIcons: { flexDirection: 'row' },
  iconAction: { marginLeft: 12 },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 12 },
  sectionSubtitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8, marginTop: 5 },
  rowItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowText: { flex: 1, color: '#444' },
  rowTextCenter: { flex: 1, textAlign: 'center', color: '#444' },
  rowTextBold: { flex: 1, textAlign: 'right', fontWeight: 'bold', color: '#000' },
  historialBox: { backgroundColor: '#EBF5F5', padding: 10, borderRadius: 8, marginVertical: 10 },
  historialTitle: { fontSize: 12, fontWeight: 'bold', color: '#097678' },
  historialText: { fontSize: 11, color: '#666', fontStyle: 'italic' },
  insumoText: { fontSize: 13, color: '#555', marginLeft: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, borderTopWidth: 1, borderColor: '#F0F0F0', paddingTop: 10 },
  totalText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  statusBadge: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontWeight: 'bold', fontSize: 12 },
  fab: { position: 'absolute', bottom: 30, right: 20, backgroundColor: '#097678', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#EEE' },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  input: { borderBottomWidth: 1, borderColor: '#DDD', padding: 10, marginBottom: 15, color: '#000' },
  inputSmall: { borderBottomWidth: 1, borderColor: '#DDD', padding: 5, color: '#000', fontSize: 12 },
  refForm: { marginBottom: 15, padding: 10, backgroundColor: '#f9f9f9', borderRadius: 8 },
  btnAddRef: { backgroundColor: '#EEE', padding: 10, borderRadius: 8, alignItems: 'center', marginVertical: 10 },
  btnAddRefText: { color: '#097678', fontWeight: 'bold' },
  btnSave: { backgroundColor: '#097678', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20, marginBottom: 40 },
  btnSaveText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#097678', marginVertical: 10 }
});

export default RemisionesScreen;