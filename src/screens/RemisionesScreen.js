import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, 
  Alert, Modal, TextInput, ScrollView, SafeAreaView 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const RemisionesScreen = () => {
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

  useEffect(() => {
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
      .collection('remisiones')
      .where('estadoProduccion', 'not-in', ['Lista para Entrega', 'Entregado'])
      .onSnapshot(querySnapshot => {
        const data = [];
        querySnapshot?.forEach(doc => data.push({ ...doc.data(), id: doc.id }));
        data.sort((a, b) => (b.fechaCreacion?.seconds || 0) - (a.fechaCreacion?.seconds || 0));
        setRemisiones(data);
      }, err => console.log("Error:", err));

    return () => subscriber();
  }, []);

  const remisionesFiltradas = remisiones.filter(r => 
    (r.numero && String(r.numero).includes(busqueda)) || 
    (r.cliente && r.cliente.toLowerCase().includes(busqueda.toLowerCase()))
  );

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
    if (field === 'cantidad' || field === 'valorUnitario') {
      const cant = parseFloat(newRefs[index].cantidad) || 0;
      const price = parseFloat(newRefs[index].valorUnitario) || 0;
      newRefs[index].valorTotal = cant * price;
    }
    setForm({...form, referencias: newRefs});
  };

  const agregarInsumoVacio = () => {
    setForm({
      ...form,
      insumos: [...form.insumos, { id: Date.now() + 1, nombre: '', color: '', cantidad: '', unidad: '' }]
    });
  };

  const updateInsumoField = (index, field, value) => {
    let newInsumos = [...form.insumos];
    newInsumos[index][field] = value;
    setForm({...form, insumos: newInsumos});
  };

  const prepararEdicion = (item) => {
    setEditandoId(item.id);
    setForm({
      numero: item.numero || '',
      cliente: item.cliente || '',
      estadoPago: item.estadoPago || 'Por Cobrar',
      referencias: item.referencias || [],
      insumos: item.insumos || [],
      estadoProduccion: item.estadoProduccion,
      maquinaActual: item.maquinaActual,
      fechaCreacion: item.fechaCreacion 
    });
    setModalVisible(true);
  };

  const guardarRemision = async () => {
    const numeroLimpio = form.numero ? String(form.numero).trim() : '';
    if (!numeroLimpio || form.referencias.length === 0) {
      Alert.alert("Error", "Completa el número y añade al menos una prenda");
      return;
    }

    try {
      const totalUnidades = form.referencias.reduce((acc, curr) => acc + (parseInt(curr.cantidad) || 0), 0);
      const totalDinero = form.referencias.reduce((acc, curr) => acc + (parseFloat(curr.valorTotal) || 0), 0);
      
      const dataObj = {
        ...form,
        numero: numeroLimpio,
        totalGeneral: totalDinero,
        totalPrendas: totalUnidades,
        estadoProduccion: editandoId ? (form.estadoProduccion || 'Pendiente') : 'Pendiente',
        maquinaActual: editandoId ? (form.maquinaActual || 'Sin Asignar') : 'Sin Asignar',
        fechaCreacion: editandoId ? form.fechaCreacion : firestore.FieldValue.serverTimestamp()
      };

      if (editandoId) {
        await firestore().collection('remisiones').doc(editandoId).update(dataObj);
      } else {
        await firestore().collection('remisiones').add(dataObj);
      }
      setModalVisible(false);
      setEditandoId(null);
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar");
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.clienteHeader}>{item.cliente}</Text>
          <Text style={styles.subLabel}>Remisión: #{item.numero}</Text>
        </View>
        <View style={styles.headerIcons}>
          {userRole === 'gerente' && (
            <>
              <TouchableOpacity style={styles.iconAction} onPress={() => prepararEdicion(item)}>
                <Icon name="pencil" size={24} color="#097678" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconAction} onPress={() => {
                Alert.alert("Eliminar", "¿Borrar?", [
                  { text: "No" }, { text: "Sí", onPress: () => firestore().collection('remisiones').doc(item.id).delete() }
                ]);
              }}>
                <Icon name="trash-can" size={24} color="#E17055" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View style={styles.divider} />
      <Text style={styles.sectionSubtitle}>Prendas:</Text>
      {item.referencias?.map((r, i) => (
        <Text key={i} style={{fontSize: 13, color: '#444'}}>
          • {r.ref} ({r.color}) - Talla: {r.tallas || 'N/A'}: {r.cantidad} unds x ${parseFloat(r.valorUnitario || 0).toLocaleString()}
        </Text>
      ))}

      {item.insumos?.length > 0 && (
        <View style={{marginTop: 10}}>
          <Text style={styles.sectionSubtitle}>Insumos Cliente:</Text>
          {item.insumos.map((ins, i) => (
            <Text key={i} style={styles.insumoText}>- {ins.nombre}: {ins.cantidad} {ins.unidad}</Text>
          ))}
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.totalText}>Total: ${parseFloat(item.totalGeneral || 0).toLocaleString()}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBar}>
        <Icon name="magnify" size={24} color="#666" />
        <TextInput 
          placeholder="Buscar..." 
          placeholderTextColor= '#666'
          color= '#000'
          style={{flex: 1, marginLeft: 10}} 
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
            <Text style={styles.modalTitle}>{editandoId ? 'Editar' : 'Nueva'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Icon name="close" size={28} /></TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }}>
            <TextInput 
              placeholder="Número" 
              placeholderTextColor="#666" 
              style={styles.input} 
              value={form.numero} 
              onChangeText={t => setForm({...form, numero: t})} 
            />
            <TextInput 
              placeholder="Cliente" 
              placeholderTextColor="#666" 
              style={styles.input} 
              value={form.cliente} 
              onChangeText={t => setForm({...form, cliente: t})} 
            />

            <Text style={styles.sectionTitle}>1. Prendas / Referencias</Text>
            {form.referencias.map((r, i) => (
              <View key={r.id} style={styles.refForm}>
                <TextInput 
                  placeholder="Referencia" 
                  placeholderTextColor= '#666'
                  color= '#000'
                  style={styles.inputSmall} 
                  value={r.ref} 
                  onChangeText={t => updateRefField(i, 'ref', t)} 
                />
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 10}}>
                    <TextInput 
                      placeholder="Color" 
                      placeholderTextColor= '#666'
                      color= '#000'
                      style={[styles.inputSmall, {width: '22%'}]} 
                      value={r.color} 
                      onChangeText={t => updateRefField(i, 'color', t)} 
                    />
                    {/* RESTAURADO: TALLA */}
                    <TextInput 
                      placeholder="Talla" 
                      placeholderTextColor= '#666'
                      color= '#000'
                      style={[styles.inputSmall, {width: '22%'}]} 
                      value={r.tallas} 
                      onChangeText={t => updateRefField(i, 'tallas', t)} 
                    />
                    <TextInput 
                      placeholder="Cant" 
                      placeholderTextColor= '#666'
                      color= '#000'
                      keyboardType="numeric" 
                      style={[styles.inputSmall, {width: '22%'}]} 
                      value={r.cantidad.toString()} 
                      onChangeText={t => updateRefField(i, 'cantidad', t)} 
                    />
                    <TextInput 
                      placeholder="V. Unit" 
                      placeholderTextColor= '#666'
                      color= '#000'
                      keyboardType="numeric" 
                      style={[styles.inputSmall, {width: '22%'}]} 
                      value={r.valorUnitario.toString()} 
                      onChangeText={t => updateRefField(i, 'valorUnitario', t)} 
                    />
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.btnAddRef} onPress={agregarReferenciaVacia}><Text style={{color: '#097678'}}>+ Añadir Prenda</Text></TouchableOpacity>

            <Text style={styles.sectionTitle}>2. Insumos del Cliente</Text>
            {form.insumos.map((ins, i) => (
              <View key={ins.id} style={styles.refForm}>
                <TextInput 
                  placeholder="Nombre Insumo" 
                  placeholderTextColor= '#666'
                  color= '#000'
                  style={styles.inputSmall} 
                  value={ins.nombre} 
                  onChangeText={t => updateInsumoField(i, 'nombre', t)} 
                />
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 10}}>
                    <TextInput 
                      placeholder="Cant" 
                      placeholderTextColor= '#666'
                      color= '#000'
                      keyboardType="numeric" 
                      style={[styles.inputSmall, {width: '45%'}]} 
                      value={ins.cantidad} 
                      onChangeText={t => updateInsumoField(i, 'cantidad', t)} 
                    />
                    <TextInput 
                      placeholder="Unidad" 
                      placeholderTextColor= '#666'
                      color= '#000'
                      style={[styles.inputSmall, {width: '45%'}]} 
                      value={ins.unidad} 
                      onChangeText={t => updateInsumoField(i, 'unidad', t)} 
                    />
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.btnAddRef} onPress={agregarInsumoVacio}><Text style={{color: '#097678'}}>+ Añadir Insumo</Text></TouchableOpacity>

            <TouchableOpacity style={styles.btnSave} onPress={guardarRemision}><Text style={{color: '#FFF', fontWeight: 'bold'}}>GUARDAR REMISIÓN</Text></TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F7F6' },
    searchBar: { flexDirection: 'row', backgroundColor: '#FFF', margin: 15, padding: 10, borderRadius: 10, alignItems: 'center' },
    card: { backgroundColor: '#FFF', borderRadius: 15, padding: 15, marginBottom: 20, elevation: 4, marginHorizontal: 15 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    clienteHeader: { fontSize: 18, fontWeight: 'bold', color: '#097678' },
    headerIcons: { flexDirection: 'row' },
    iconAction: { marginLeft: 15 },
    divider: { height: 1, backgroundColor: '#EEE', marginVertical: 10 },
    sectionSubtitle: { fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 5 },
    insumoText: { fontSize: 12, color: '#666', marginLeft: 10 },
    cardFooter: { marginTop: 10, borderTopWidth: 1, borderColor: '#EEE', paddingTop: 10 },
    totalText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#097678', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#EEE' },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    input: { borderBottomWidth: 1, borderColor: '#DDD', marginBottom: 15, color: '#000', padding: 5 },
    inputSmall: { borderBottomWidth: 1, borderColor: '#DDD', color: '#000', padding: 5 },
    refForm: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 8, marginBottom: 10 },
    btnAddRef: { backgroundColor: '#EEE', padding: 10, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
    btnSave: { backgroundColor: '#097678', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20, marginBottom: 40 },
    sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#097678', marginVertical: 15 },
});

export default RemisionesScreen;