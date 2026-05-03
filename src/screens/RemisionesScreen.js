import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, Modal, TextInput, ScrollView, SafeAreaView,
  ActivityIndicator
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
  const [loading, setLoading] = useState(false);
  
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

  const eliminarReferencia = (index) => {
    const nuevas = [...form.referencias];
    nuevas.splice(index, 1);
    setForm({...form, referencias: nuevas});
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
      insumos: [...form.insumos, {
        id: Date.now() + 1, nombre: '', color: '', cantidad: '', unidad: '', origen: 'Cliente'
      }]
    });
  };

  const eliminarInsumo = (index) => {
    const nuevos = [...form.insumos];
    nuevos.splice(index, 1);
    setForm({...form, insumos: nuevos});
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
    if (loading) return;
    setLoading(true);

    try {
      if (!editandoId) {
        const query = await firestore().collection('remisiones').where('numero', '==', numeroLimpio).get();
        if (!query.empty) {
          Alert.alert("Aviso", "Ya existe una remisión con este número.");
          setLoading(false);
          return;
        }
      }

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
      Alert.alert("Error", "No se pudo guardar la información.");
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {/* HEADER */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.clienteHeader}>{item.cliente}</Text>
          <View style={styles.numeroTag}>
            <Icon name="file-document-outline" size={12} color="#097678" />
            <Text style={styles.subLabel}>  Remisión #{item.numero}</Text>
          </View>
        </View>
        <View style={styles.headerIcons}>
          {userRole === 'gerente' && (
            <>
              <TouchableOpacity style={styles.iconAction} onPress={() => prepararEdicion(item)}>
                <Icon name="pencil" size={22} color="#ec9025" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconAction} onPress={() => {
                Alert.alert("Eliminar", "¿Borrar?", [
                  { text: "No" }, { text: "Sí", onPress: () => firestore().collection('remisiones').doc(item.id).delete() }
                ]);
              }}>
                <Icon name="trash-can" size={22} color="#E17055" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View style={styles.divider} />

      {/* SECCIÓN PRENDAS */}
      <View style={styles.sectionHeader}>
        <Icon name="tshirt-crew-outline" size={14} color="#097678" />
        <Text style={styles.sectionSubtitle}>  Prendas</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{item.referencias?.length || 0}</Text>
        </View>
      </View>

      {item.referencias?.map((r, i) => (
        <View key={i} style={styles.refCard}>
          {/* Fila superior: nombre + chip de color */}
          <View style={styles.refTopRow}>
            <Text style={styles.refNombre} numberOfLines={1}>{r.ref}</Text>
            <View style={styles.colorChip}>
              <Text style={styles.colorChipText}>{r.color}</Text>
            </View>
          </View>
          {/* Fila inferior: talla, cantidad, valor */}
          <View style={styles.refDataRow}>
            <View style={styles.refDataPill}>
              <Text style={styles.refDataLabel}>TALLA</Text>
              <Text style={styles.refDataValue}>{r.tallas || 'N/A'}</Text>
            </View>
            <View style={styles.refDataPill}>
              <Text style={styles.refDataLabel}>CANT.</Text>
              <Text style={styles.refDataValue}>{r.cantidad} uds</Text>
            </View>
            {userRole === 'gerente' && (
              <View style={[styles.refDataPill, styles.refDataPillPrice]}>
                <Text style={[styles.refDataLabel, {color: '#097678'}]}>V. UNIT</Text>
                <Text style={[styles.refDataValue, {color: '#097678', fontWeight: '700'}]}>
                  ${parseFloat(r.valorUnitario || 0).toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        </View>
      ))}

      {/* SECCIÓN INSUMOS */}
      {item.insumos?.length > 0 && (
        <View style={{marginTop: 12}}>
          <View style={styles.sectionHeader}>
            <Icon name="package-variant-closed" size={14} color="#6c5ce7" />
            <Text style={[styles.sectionSubtitle, {color: '#6c5ce7'}]}>  Insumos Cargados</Text>
            <View style={[styles.countBadge, {backgroundColor: '#ede9ff'}]}>
              <Text style={[styles.countBadgeText, {color: '#6c5ce7'}]}>{item.insumos.length}</Text>
            </View>
          </View>

          <View style={styles.insumosContainer}>
            {item.insumos.map((ins, i) => (
              <View key={i} style={styles.insumoRow}>
                <View style={[
                  styles.insumoBadge,
                  {backgroundColor: ins.origen === 'Inventario' ? '#e6f4f4' : '#fff3e0'}
                ]}>
                  <Text style={[
                    styles.insumoBadgeText,
                    {color: ins.origen === 'Inventario' ? '#097678' : '#e67e22'}
                  ]}>
                    {ins.origen === 'Inventario' ? 'INV' : 'CLI'}
                  </Text>
                </View>
                <Text style={styles.insumoNombre} numberOfLines={1}>{ins.nombre}</Text>
                <Text style={styles.insumoCantidad}>{ins.cantidad} {ins.unidad}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* TOTAL */}
      {userRole === 'gerente' && (
        <View style={styles.cardFooter}>
          <View style={styles.totalContainer}>
            <Icon name="cash-multiple" size={16} color="#097678" />
            <Text style={styles.totalLabel}>  Total Remisión</Text>
          </View>
          <Text style={styles.totalText}>${parseFloat(item.totalGeneral || 0).toLocaleString()}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBar}>
        <Icon name="magnify" size={24} color="#666" />
        <TextInput
          placeholder="Buscar..."
          placeholderTextColor='#666'
          color='#000'
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

      {userRole === 'gerente' && (
        <TouchableOpacity style={styles.fab} onPress={() => {
          setEditandoId(null);
          setForm({ numero: '', cliente: '', estadoPago: 'Por Cobrar', referencias: [], insumos: [] });
          setModalVisible(true);
        }}>
          <Icon name="plus" size={30} color="#FFF" />
        </TouchableOpacity>
      )}

      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editandoId ? 'Editar' : 'Nueva Remisión'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Icon name="close" size={28} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 20 }}>
            <Text style={styles.formLabel}>Información General</Text>
            <TextInput
              placeholder="Remision #"
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
                <View style={styles.rowBetween}>
                  <Text style={styles.itemBadge}>Prenda #{i+1}</Text>
                  <TouchableOpacity onPress={() => eliminarReferencia(i)}>
                    <Icon name="close-circle" size={22} color="#E17055" />
                  </TouchableOpacity>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.miniLabel}>Referencia</Text>
                  <TextInput
                    placeholder="Ej: Camisa Polo"
                    placeholderTextColor='#999'
                    color='#000'
                    style={styles.inputSmall}
                    value={r.ref}
                    onChangeText={t => updateRefField(i, 'ref', t)}
                  />
                </View>

                <View style={styles.rowInputs}>
                  <View style={{width: '23%'}}>
                    <Text style={styles.miniLabel}>Color</Text>
                    <TextInput placeholder="Color" placeholderTextColor='#999' color='#000' style={styles.inputSmall} value={r.color} onChangeText={t => updateRefField(i, 'color', t)} />
                  </View>
                  <View style={{width: '23%'}}>
                    <Text style={styles.miniLabel}>Talla</Text>
                    <TextInput placeholder="Talla" placeholderTextColor='#999' color='#000' style={styles.inputSmall} value={r.tallas} onChangeText={t => updateRefField(i, 'tallas', t)} />
                  </View>
                  <View style={{width: '23%'}}>
                    <Text style={styles.miniLabel}>Cant</Text>
                    <TextInput placeholder="0" placeholderTextColor='#999' color='#000' keyboardType="numeric" style={styles.inputSmall} value={r.cantidad.toString()} onChangeText={t => updateRefField(i, 'cantidad', t)} />
                  </View>
                  <View style={{width: '23%'}}>
                    <Text style={styles.miniLabel}>V. Unit</Text>
                    <TextInput placeholder="0" placeholderTextColor='#999' color='#000' keyboardType="numeric" style={styles.inputSmall} value={r.valorUnitario.toString()} onChangeText={t => updateRefField(i, 'valorUnitario', t)} />
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.btnAddRef} onPress={agregarReferenciaVacia}>
              <Icon name="plus" size={18} color="#000" />
              <Text style={{color: '#000', marginLeft: 5}}>Añadir Prenda</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>2. Insumos del Cliente</Text>

            {form.insumos.map((ins, i) => (
              <View key={ins.id} style={styles.refForm}>
                <View style={styles.rowBetween}>
                  <Text style={styles.itemBadge}>Insumo #{i+1}</Text>
                  <TouchableOpacity onPress={() => eliminarInsumo(i)}>
                    <Icon name="close-circle" size={22} color="#E17055" />
                  </TouchableOpacity>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.miniLabel}>Nombre Insumo</Text>
                  <TextInput placeholder="Nombre Insumo" placeholderTextColor='#999' color='#000' style={styles.inputSmall} value={ins.nombre} onChangeText={t => updateInsumoField(i, 'nombre', t)} />
                </View>

                <View style={[styles.rowInputs, {marginTop: 10}]}>
                  <View style={{width: '48%'}}>
                    <Text style={styles.miniLabel}>Cantidad</Text>
                    <TextInput placeholder="0" placeholderTextColor='#999' color='#000' keyboardType="numeric" style={styles.inputSmall} value={ins.cantidad} onChangeText={t => updateInsumoField(i, 'cantidad', t)} />
                  </View>
                  <View style={{width: '48%'}}>
                    <Text style={styles.miniLabel}>Unidad</Text>
                    <TextInput placeholder="Mts / Unds" placeholderTextColor='#999' color='#000' style={styles.inputSmall} value={ins.unidad} onChangeText={t => updateInsumoField(i, 'unidad', t)} />
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.btnAddRef} onPress={agregarInsumoVacio}>
              <Icon name="plus" size={18} color="#000" />
              <Text style={{color: '#000', marginLeft: 5}}>Añadir Insumo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnSave, loading && { opacity: 0.7 }]}
              onPress={guardarRemision}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={{color: '#FFF', fontWeight: 'bold'}}>GUARDAR REMISIÓN</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  searchBar: {
    flexDirection: 'row', backgroundColor: '#FFF', margin: 15,
    padding: 10, borderRadius: 10, alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
  },

  // ─── CARD ──────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16,
    marginBottom: 20, elevation: 4, marginHorizontal: 15,
    shadowColor: '#097678', shadowOpacity: 0.08, shadowRadius: 8,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flex: 1 },
  clienteHeader: { fontSize: 18, fontWeight: '800', color: '#097678', marginBottom: 4 },
  numeroTag: { flexDirection: 'row', alignItems: 'center' },
  subLabel: { fontSize: 12, color: '#888', fontWeight: '500' },
  headerIcons: { flexDirection: 'row', marginLeft: 8 },
  iconAction: { marginLeft: 12 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 },

  // ─── SECTION HEADER ────────────────────────────────────────
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sectionSubtitle: { fontSize: 12, fontWeight: '800', color: '#097678', letterSpacing: 0.5, textTransform: 'uppercase' },
  countBadge: {
    marginLeft: 6, backgroundColor: '#e6f4f4',
    borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1,
  },
  countBadgeText: { fontSize: 11, fontWeight: '700', color: '#097678' },

  // ─── PRENDA CARD ───────────────────────────────────────────
  refCard: {
    backgroundColor: '#f8fafa',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#097678',
  },
  refTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  refNombre: { fontSize: 14, fontWeight: '700', color: '#222', flex: 1, marginRight: 8 },
  colorChip: {
    backgroundColor: '#097678', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  colorChipText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  refDataRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  refDataPill: {
    backgroundColor: '#FFF', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#e0e8e8',
    alignItems: 'center', minWidth: 60,
  },
  refDataPillPrice: { borderColor: '#b2dfdb' },
  refDataLabel: { fontSize: 9, color: '#aaa', fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  refDataValue: { fontSize: 13, fontWeight: '600', color: '#333', marginTop: 1 },

  // ─── INSUMOS ───────────────────────────────────────────────
  insumosContainer: {
    backgroundColor: '#faf9ff', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#ede9ff',
  },
  insumoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1, borderBottomColor: '#f0eeff',
  },
  insumoBadge: {
    borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3,
    minWidth: 38, alignItems: 'center', marginRight: 10,
  },
  insumoBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  insumoNombre: { flex: 1, fontSize: 13, color: '#444', fontWeight: '500' },
  insumoCantidad: { fontSize: 12, color: '#6c5ce7', fontWeight: '700' },

  // ─── FOOTER ────────────────────────────────────────────────
  cardFooter: {
    marginTop: 14, borderTopWidth: 1, borderColor: '#F0F0F0',
    paddingTop: 10, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  totalContainer: { flexDirection: 'row', alignItems: 'center' },
  totalLabel: { fontSize: 13, color: '#888', fontWeight: '600' },
  totalText: { fontSize: 18, fontWeight: '800', color: '#097678' },

  // ─── FAB ───────────────────────────────────────────────────
  fab: {
    position: 'absolute', bottom: 20, right: 20,
    backgroundColor: '#097678', width: 60, height: 60,
    borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5,
  },

  // ─── MODAL ─────────────────────────────────────────────────
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderColor: '#EEE',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  formLabel: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 10 },
  input: { borderBottomWidth: 1, borderColor: '#DDD', marginBottom: 15, color: '#000', padding: 5, fontSize: 16 },
  miniLabel: { fontSize: 11, color: '#097678', fontWeight: 'bold', marginBottom: 2 },
  inputSmall: { borderBottomWidth: 1, borderColor: '#CCC', color: '#000', padding: 3, fontSize: 14 },
  refForm: {
    backgroundColor: '#f0f4f7', padding: 12, borderRadius: 10,
    marginBottom: 15, borderWidth: 1, borderColor: '#d1d8dd',
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  rowInputs: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  fieldGroup: { marginBottom: 5 },
  itemBadge: {
    backgroundColor: '#097678', color: '#FFF',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 5, fontSize: 11, fontWeight: 'bold',
  },
  btnAddRef: {
    flexDirection: 'row', backgroundColor: '#E3E8E7', padding: 12,
    borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  btnSave: {
    backgroundColor: '#097678', padding: 15, borderRadius: 10,
    alignItems: 'center', marginTop: 20, marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 16, fontWeight: 'bold', color: '#097678',
    marginVertical: 15, borderLeftWidth: 4, borderColor: '#097678', paddingLeft: 10,
  },
});

export default RemisionesScreen;