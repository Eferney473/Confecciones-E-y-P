import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, 
  Alert, Modal, TextInput, ActivityIndicator, ScrollView, SafeAreaView 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const InventarioScreen = () => {
  const [insumos, setInsumos] = useState([]);
  const [filteredInsumos, setFilteredInsumos] = useState([]);
  const [search, setSearch] = useState('');
  const [remisiones, setRemisiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('operario');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalAsignar, setModalAsignar] = useState(false);
  const [modalHistorial, setModalHistorial] = useState(false);
  
  const [listaHistorial, setListaHistorial] = useState([]);
  const [insumoSeleccionado, setInsumoSeleccionado] = useState(null);
  const [cantidadAfectar, setCantidadAfectar] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({ nombre: '', color: '', cantidad: '' });

  useEffect(() => {
    // Obtener rol del usuario
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

    const subInsumos = firestore()
      .collection('inventario')
      .where('cantidad', '>', 0)
      .orderBy('cantidad', 'desc')
      .onSnapshot(snap => {
        const data = [];
        snap?.forEach(doc => data.push({ ...doc.data(), id: doc.id }));
        setInsumos(data);
        setFilteredInsumos(data);
        setLoading(false);
      }, error => {
        console.log("Error en filtro:", error);
        setLoading(false);
      });

    const subRemisiones = firestore()
      .collection('remisiones')
      .where('estadoProduccion', 'not-in', ['Lista para Entrega', 'Entregado']) 
      .onSnapshot(snap => {
        const data = [];
        snap?.forEach(doc => data.push({ ...doc.data(), id: doc.id }));
        data.sort((a, b) => b.numero - a.numero); 
        setRemisiones(data);
      }, error => {
        console.log("Error cargando remisiones en inventario:", error);
      });

    return () => { subInsumos(); subRemisiones(); };
  }, []);

  const handleSearch = (text) => {
    setSearch(text);
    const filtered = insumos.filter(item => 
      item.nombre.toLowerCase().includes(text.toLowerCase()) ||
      (item.color && item.color.toLowerCase().includes(text.toLowerCase()))
    );
    setFilteredInsumos(filtered);
  };

  const getStockStatus = (cantidad) => {
    const cant = parseInt(cantidad);
    if (cant <= 5) return { color: '#E74C3C', bg: '#FDEDEC', label: 'CRÍTICO' };
    if (cant <= 15) return { color: '#F39C12', bg: '#FEF5E7', label: 'BAJO' };
    return { color: '#097678', bg: '#EFFFFD', label: 'STOCK' };
  };

  const abrirHistorial = async () => {
    try {
      const snap = await firestore()
        .collection('historial_inventario')
        .orderBy('fecha', 'desc')
        .limit(30)
        .get();
      const data = [];
      snap.forEach(doc => data.push({ ...doc.data(), id: doc.id }));
      setListaHistorial(data);
      setModalHistorial(true);
    } catch (error) {
      Alert.alert("Error", "No se pudo cargar el historial");
    }
  };

  const procesarMovimiento = async (tipo, destinoId = null, clienteNombre = '', numeroRemision = '') => {
    // Jefe de planta no puede procesar movimientos
    if (userRole === 'jefe_planta') {
      Alert.alert("Sin permiso", "No tienes permiso para mover insumos.");
      return;
    }
    const cant = parseInt(cantidadAfectar);
    if (!cant || cant <= 0 || cant > insumoSeleccionado.cantidad) {
      Alert.alert("Error", "Cantidad no válida o insuficiente en stock");
      return;
    }
    try {
      const batch = firestore().batch();
      const insumoRef = firestore().collection('inventario').doc(insumoSeleccionado.id);
      const historialRef = firestore().collection('historial_inventario').doc();

      batch.update(insumoRef, { cantidad: firestore.FieldValue.increment(-cant) });

      if (tipo === 'Asignar' && destinoId) {
        const remisionRef = firestore().collection('remisiones').doc(destinoId);
        batch.update(remisionRef, {
          insumos: firestore.FieldValue.arrayUnion({
            id: Date.now(),
            nombre: insumoSeleccionado.nombre,
            color: insumoSeleccionado.color || 'N/A',
            cantidad: cant,
            unidad: 'Und',
            origen: 'Inventario',
            fechaAsignacion: new Date().toISOString()
          })
        });
      }

      batch.set(historialRef, {
        tipoMovimiento: tipo,
        insumoId: insumoSeleccionado.id,
        nombreInsumo: insumoSeleccionado.nombre,
        cantidad: cant,
        destino: tipo === 'Asignar' ? `Remisión #${numeroRemision} - ${clienteNombre}` : 'Devolución a Empresa',
        usuario: auth().currentUser?.email || 'Admin',
        fecha: firestore.FieldValue.serverTimestamp()
      });

      await batch.commit();
      Alert.alert("Éxito", "Movimiento registrado");
      setModalAsignar(false);
      setCantidadAfectar('');
    } catch (error) {
      Alert.alert("Error", "No se pudo completar la operación");
    }
  };

  const guardarInsumo = async () => {
    // Jefe de planta no puede crear/editar insumos
    if (userRole === 'jefe_planta') {
      Alert.alert("Sin permiso", "No tienes permiso para modificar el inventario.");
      return;
    }
    if (!form.nombre || !form.cantidad) return;
    const datos = { 
      nombre: form.nombre.trim(), 
      color: form.color.trim(), 
      cantidad: parseInt(form.cantidad),
      ultimaActualizacion: firestore.FieldValue.serverTimestamp() 
    };
    try {
      if (editandoId) {
        await firestore().collection('inventario').doc(editandoId).update(datos);
      } else {
        await firestore().collection('inventario').add(datos);
      }
      cerrarModal();
    } catch (e) {
      Alert.alert("Error", "No se pudo guardar");
    }
  };

  const eliminarInsumo = (id, nombre) => {
    // Jefe de planta no puede eliminar
    if (userRole === 'jefe_planta') {
      Alert.alert("Sin permiso", "No tienes permiso para eliminar insumos.");
      return;
    }
    Alert.alert("Eliminar", `¿Borrar ${nombre}?`, [
      { text: "No" },
      { text: "Sí", onPress: () => firestore().collection('inventario').doc(id).delete() }
    ]);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setEditandoId(null);
    setForm({ nombre: '', color: '', cantidad: '' });
  };

  const renderItem = ({ item }) => {
    const status = getStockStatus(item.cantidad);
    const soloLectura = userRole === 'jefe_planta';
    
    return (
      <View style={[styles.card, { borderLeftColor: status.color, borderLeftWidth: 5 }]}>
        <View style={styles.cardHeader}>
          <View style={styles.infoCol}>
            <Text style={styles.insumoNombre}>{item.nombre}</Text>
            <Text style={styles.insumoSubtitle}>Color: {item.color || 'N/A'}</Text>
          </View>
          <View style={[styles.qtyContainer, { backgroundColor: status.bg }]}>
            <Text style={[styles.insumoCantidad, { color: status.color }]}>{item.cantidad}</Text>
            <Text style={[styles.qtyLabel, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          {/* Asignar/Devolver: solo gerente y operario */}
          {!soloLectura ? (
            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={() => { setInsumoSeleccionado(item); setModalAsignar(true); }}
            >
              <Icon name="swap-horizontal-bold" size={20} color="#2348ec" />
              <Text style={[styles.actionText, {color: '#097678'}]}>Asignar o Devolver</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.soloLecturaTag}>
              <Icon name="eye-outline" size={16} color="#999" />
              <Text style={styles.soloLecturaText}>Solo lectura</Text>
            </View>
          )}

          {/* Editar/Eliminar: solo gerente y operario */}
          {!soloLectura && (
            <View style={styles.rightActions}>
              <TouchableOpacity onPress={() => {
                setEditandoId(item.id);
                setForm({ nombre: item.nombre, color: item.color, cantidad: item.cantidad.toString() });
                setModalVisible(true);
              }}>
                <Icon name="pencil" size={22} color="#ec9025" style={{marginRight: 20}} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => eliminarInsumo(item.id, item.nombre)}>
                <Icon name="trash-can" size={22} color="#E74C3C" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#097678" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Icon name="magnify" size={22} color="#999" />
          <TextInput
            placeholder="Buscar por nombre o color..."
            placeholderTextColor="#999"
            color="#000"
            style={styles.searchInput}
            value={search}
            onChangeText={handleSearch}
          />
          {search !== '' && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Icon name="close-circle" size={20} color="#CCC" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <TouchableOpacity style={styles.historialHeaderBtn} onPress={abrirHistorial}>
        <Icon name="history" size={20} color="#097678" />
        <Text style={styles.historialHeaderText}>Historial de Movimientos</Text>
      </TouchableOpacity>

      <FlatList
        data={filteredInsumos}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={{alignItems: 'center', marginTop: 50}}>
            <Icon name="archive-off-outline" size={50} color="#CCC" />
            <Text style={{color: '#999', marginTop: 10}}>No se encontraron insumos</Text>
          </View>
        }
      />

      {/* FAB: solo gerente y operario */}
      {userRole !== 'jefe_planta' && (
        <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
          <Icon name="plus" size={30} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* MODAL ASIGNAR / DEVOLVER */}
      <Modal visible={modalAsignar} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Procesar: {insumoSeleccionado?.nombre}</Text>
            <Text style={styles.labelInput}>Cantidad disponible: {insumoSeleccionado?.cantidad}</Text>
            <TextInput 
              placeholder="Cantidad a mover" 
              placeholderTextColor="#999"
              keyboardType="numeric"
              style={styles.input}
              value={cantidadAfectar}
              onChangeText={setCantidadAfectar}
            />

            <Text style={styles.sectionSubtitle}>¿A dónde se mueve?</Text>
            <ScrollView style={{maxHeight: 250, marginVertical: 10}}>
              <TouchableOpacity 
                style={[styles.remisionOption, {backgroundColor: '#FFF5F5', borderRadius: 8, marginBottom: 8}]}
                onPress={() => procesarMovimiento('Devolver')}
              >
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Icon name="reply" size={22} color="#E17055" style={{marginRight: 10}} />
                  <Text style={[styles.remisionOptionText, {color: '#E17055', fontWeight: 'bold'}]}>Devolver a Almacén Empresa</Text>
                </View>
              </TouchableOpacity>

              {remisiones.map(rem => (
                <TouchableOpacity 
                  key={rem.id} 
                  style={styles.remisionOption}
                  onPress={() => procesarMovimiento('Asignar', rem.id, rem.cliente, rem.numero)}
                >
                  <Text style={styles.remisionOptionText}>Asignar a: #{rem.numero} - {rem.cliente}</Text>
                  <Icon name="chevron-right" size={20} color="#097678" />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.btnCancelFull} onPress={() => setModalAsignar(false)}>
              <Text style={{textAlign: 'center', color: '#666', fontWeight: 'bold'}}>CANCELAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL HISTORIAL */}
      <Modal visible={modalHistorial} animationType="slide">
        <SafeAreaView style={{flex: 1, backgroundColor: '#F4F7F6'}}>
          <View style={styles.modalHeaderCustom}>
            <Text style={styles.modalTitle}>Historial de Inventario</Text>
            <TouchableOpacity onPress={() => setModalHistorial(false)}>
              <Icon name="close" size={30} color="#333" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={listaHistorial}
            keyExtractor={item => item.id}
            contentContainerStyle={{padding: 15}}
            renderItem={({item}) => (
              <View style={styles.historialCard}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                  <Text style={[styles.tipoTag, {backgroundColor: item.tipoMovimiento === 'Asignar' ? '#EFFFFD' : '#FFF5F5', color: item.tipoMovimiento === 'Asignar' ? '#097678' : '#E17055'}]}>
                    {item.tipoMovimiento}
                  </Text>
                  <Text style={styles.fechaHistorial}>{item.fecha?.toDate().toLocaleDateString()} {item.fecha?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                </View>
                <Text style={styles.historialMainText}>{item.cantidad} x {item.nombreInsumo}</Text>
                <Text style={styles.historialDestino}><Icon name="map-marker" /> {item.destino}</Text>
                <Text style={{fontSize: 11, color: '#999', marginTop: 4}}>Por: {item.usuario}</Text>
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* MODAL CRUD */}
      <Modal visible={modalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editandoId ? 'Editar' : 'Nuevo'} Insumo</Text>
            <TextInput placeholder="Insumo" placeholderTextColor="#999" style={styles.input} value={form.nombre} onChangeText={t => setForm({...form, nombre: t})} />
            <TextInput placeholder="Color" placeholderTextColor="#999" style={styles.input} value={form.color} onChangeText={t => setForm({...form, color: t})} />
            <TextInput placeholder="Cantidad" placeholderTextColor="#999" keyboardType="numeric" style={styles.input} value={form.cantidad} onChangeText={t => setForm({...form, cantidad: t})} />
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 10}}>
              <TouchableOpacity style={styles.btnCancel} onPress={cerrarModal}><Text style={{color: '#098678', fontWeight: 'bold'}}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={guardarInsumo}><Text style={{color: '#FFF', fontWeight: 'bold'}}>Guardar</Text></TouchableOpacity>
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
  searchSection: { backgroundColor: '#FFF', paddingBottom: 10, paddingHorizontal: 15, paddingTop: 10 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2F2', borderRadius: 10, paddingHorizontal: 10, height: 45 },
  searchInput: { flex: 1, marginLeft: 8, color: '#333', fontSize: 15 },
  historialHeaderBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#EEE' },
  historialHeaderText: { color: '#097678', fontWeight: 'bold', marginLeft: 8, fontSize: 13 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: {width:0, height:2} },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 10 },
  infoCol: { flex: 1 },
  insumoNombre: { fontSize: 17, fontWeight: 'bold', color: '#2D3436' },
  insumoSubtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  qtyContainer: { alignItems: 'center', padding: 8, borderRadius: 8, minWidth: 70 },
  insumoCantidad: { fontSize: 18, fontWeight: 'bold' },
  qtyLabel: { fontSize: 9, fontWeight: 'bold' },
  actionsRow: { flexDirection: 'row', marginTop: 12, alignItems: 'center', justifyContent: 'space-between' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9F9', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20 },
  actionText: { marginLeft: 5, fontSize: 12, fontWeight: 'bold' },
  rightActions: { flexDirection: 'row', alignItems: 'center' },
  soloLecturaTag: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  soloLecturaText: { fontSize: 12, color: '#999', marginLeft: 5, fontStyle: 'italic' },
  fab: { position: 'absolute', bottom: 25, right: 25, backgroundColor: '#097678', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 15, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#097678' },
  modalHeaderCustom: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#EEE', alignItems: 'center' },
  sectionSubtitle: { fontSize: 14, fontWeight: 'bold', color: '#666', marginTop: 15, marginBottom: 10 },
  labelInput: { fontSize: 12, color: '#999', marginBottom: 5 },
  input: { backgroundColor: '#F5F5F5', borderRadius: 8, padding: 12, marginBottom: 15, color: '#000', borderWidth: 1, borderColor: '#E0E0E0' },
  remisionOption: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', alignItems: 'center' },
  remisionOptionText: { fontSize: 13, color: '#333' },
  btnSave: { backgroundColor: '#097678', padding: 12, borderRadius: 8, flex: 0.45, alignItems: 'center' },
  btnCancel: { backgroundColor: '#EEE', padding: 12, borderRadius: 8, flex: 0.45, alignItems: 'center' },
  btnCancelFull: { backgroundColor: '#F5F5F5', padding: 15, borderRadius: 8, marginTop: 10 },
  historialCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#097678' },
  tipoTag: { fontSize: 10, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  fechaHistorial: { fontSize: 11, color: '#999' },
  historialMainText: { fontSize: 15, fontWeight: 'bold', marginVertical: 5, color: '#333' },
  historialDestino: { fontSize: 13, color: '#666' }
});

export default InventarioScreen;