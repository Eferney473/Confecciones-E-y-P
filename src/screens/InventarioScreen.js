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
  const [remisiones, setRemisiones] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalAsignar, setModalAsignar] = useState(false);
  const [modalHistorial, setModalHistorial] = useState(false);
  
  const [listaHistorial, setListaHistorial] = useState([]);
  const [insumoSeleccionado, setInsumoSeleccionado] = useState(null);
  const [cantidadAfectar, setCantidadAfectar] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({ nombre: '', color: '', cantidad: '' });

  useEffect(() => {
    const subInsumos = firestore()
      .collection('inventario')
      .where('cantidad', '>', 0)
      .orderBy('cantidad', 'desc')
      .onSnapshot(snap => {
        const data = [];
        snap?.forEach(doc => data.push({ ...doc.data(), id: doc.id }));
        setInsumos(data);
        setLoading(false);
      }, error => {
        console.log("Error en filtro:", error);
        setLoading(false);
      });

    // Escucha de Remisiones filtrada
    const subRemisiones = firestore()
      .collection('remisiones')
      // Filtramos para que SOLO aparezcan las remisiones que NO han sido entregadas o finalizadas
      // Esto hará que la lista del modal coincida con lo que ves en la pantalla de Remisiones
      .where('estadoProduccion', 'not-in', ['Lista para Entrega', 'Entregado']) 
      .onSnapshot(snap => {
        const data = [];
        snap?.forEach(doc => data.push({ ...doc.data(), id: doc.id }));
        
        // Opcional: Ordenar por número para que sea más fácil encontrarlas en la lista
        data.sort((a, b) => b.numero - a.numero); 
        
        setRemisiones(data);
      }, error => {
        console.log("Error cargando remisiones en inventario:", error);
      });

    return () => { subInsumos(); subRemisiones(); };
  }, []);

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
    const cant = parseInt(cantidadAfectar);
    if (!cant || cant <= 0 || cant > insumoSeleccionado.cantidad) {
      Alert.alert("Error", "Cantidad no válida o insuficiente en stock");
      return;
    }

    try {
      const batch = firestore().batch();
      const insumoRef = firestore().collection('inventario').doc(insumoSeleccionado.id);
      const historialRef = firestore().collection('historial_inventario').doc();

      // Descontar del inventario global
      batch.update(insumoRef, {
        cantidad: firestore.FieldValue.increment(-cant)
      });

      if (tipo === 'Asignar' && destinoId) {
        const remisionRef = firestore().collection('remisiones').doc(destinoId);
        
        // Cargamos el insumo a la remisión con la marca de "Inventario"
        batch.update(remisionRef, {
          insumos: firestore.FieldValue.arrayUnion({
            id: Date.now(), // ID único para el item en el array
            nombre: insumoSeleccionado.nombre,
            color: insumoSeleccionado.color || 'N/A',
            cantidad: cant,
            unidad: 'Und', // Puedes hacerlo dinámico si tienes el campo
            origen: 'Inventario', // <--- CLAVE PARA TU PANTALLA DE REMISIONES
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
      Alert.alert("Éxito", "Movimiento registrado correctamente");
      setModalAsignar(false);
      setCantidadAfectar('');
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "No se pudo completar la operación");
    }
  };

  const guardarInsumo = async () => {
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

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.infoCol}>
          <Text style={styles.insumoNombre}>{item.nombre}</Text>
          <Text style={styles.insumoSubtitle}>Color: {item.color || 'N/A'}</Text>
        </View>
        <View style={styles.qtyContainer}>
          <Text style={styles.insumoCantidad}>{item.cantidad}</Text>
          <Text style={styles.qtyLabel}>Stock</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity 
          style={styles.actionBtn} 
          onPress={() => { setInsumoSeleccionado(item); setModalAsignar(true); }}
        >
          <Icon name="swap-horizontal-bold" size={20} color="#097678" />
          <Text style={[styles.actionText, {color: '#097678'}]}>Asignar o Devolver</Text>
        </TouchableOpacity>

        <View style={styles.rightActions}>
          <TouchableOpacity onPress={() => {
             setEditandoId(item.id);
             setForm({ nombre: item.nombre, color: item.color, cantidad: item.cantidad.toString() });
             setModalVisible(true);
          }}>
            <Icon name="pencil" size={20} color="#666" style={{marginRight: 15}} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => eliminarInsumo(item.id, item.nombre)}>
            <Icon name="trash-can" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#097678" /></View>;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.historialHeaderBtn} onPress={abrirHistorial}>
        <Icon name="history" size={20} color="#097678" />
        <Text style={styles.historialHeaderText}>Ver Historial de Movimientos</Text>
      </TouchableOpacity>

      <FlatList
        data={insumos}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Icon name="plus" size={30} color="#FFF" />
      </TouchableOpacity>

      {/* MODAL ASIGNAR / DEVOLVER */}
      <Modal visible={modalAsignar} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Procesar: {insumoSeleccionado?.nombre}</Text>
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
                  <Text style={styles.fechaHistorial}>{item.fecha?.toDate().toLocaleDateString()}</Text>
                </View>
                <Text style={styles.historialMainText}>{item.cantidad} x {item.nombreInsumo}</Text>
                <Text style={styles.historialDestino}><Icon name="map-marker" /> {item.destino}</Text>
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
            <TextInput placeholder="Nombre" placeholderTextColor="#999" style={styles.input} value={form.nombre} onChangeText={t => setForm({...form, nombre: t})} />
            <TextInput placeholder="Color" placeholderTextColor="#999" style={styles.input} value={form.color} onChangeText={t => setForm({...form, color: t})} />
            <TextInput placeholder="Cantidad" placeholderTextColor="#999" keyboardType="numeric" style={styles.input} value={form.cantidad} onChangeText={t => setForm({...form, cantidad: t})} />
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 10}}>
                <TouchableOpacity style={styles.btnCancel} onPress={cerrarModal}><Text>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity style={styles.btnSave} onPress={guardarInsumo}><Text style={{color: '#FFF'}}>Guardar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ... (Estilos permanecen igual)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  historialHeaderBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#EEE' },
  historialHeaderText: { color: '#097678', fontWeight: 'bold', marginLeft: 8 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 10 },
  infoCol: { flex: 1 },
  insumoNombre: { fontSize: 17, fontWeight: 'bold', color: '#2D3436' },
  insumoSubtitle: { fontSize: 13, color: '#666' },
  qtyContainer: { alignItems: 'center', backgroundColor: '#EFFFFD', padding: 8, borderRadius: 8, minWidth: 60 },
  insumoCantidad: { fontSize: 18, fontWeight: 'bold', color: '#097678' },
  qtyLabel: { fontSize: 9, color: '#097678' },
  actionsRow: { flexDirection: 'row', marginTop: 12, alignItems: 'center', justifyContent: 'space-between' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9F9', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  actionText: { marginLeft: 5, fontSize: 12, fontWeight: 'bold' },
  rightActions: { flexDirection: 'row', alignItems: 'center' },
  fab: { position: 'absolute', bottom: 25, right: 25, backgroundColor: '#097678', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 15, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#097678' },
  modalHeaderCustom: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#EEE', alignItems: 'center' },
  sectionSubtitle: { fontSize: 14, fontWeight: 'bold', color: '#666', marginTop: 10, marginBottom: 10 },
  input: { backgroundColor: '#F5F5F5', borderRadius: 8, padding: 12, marginBottom: 10, color: '#000' },
  remisionOption: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', alignItems: 'center' },
  remisionOptionText: { fontSize: 13, color: '#333' },
  btnSave: { backgroundColor: '#097678', padding: 12, borderRadius: 8, flex: 0.45, alignItems: 'center' },
  btnCancel: { backgroundColor: '#EEE', padding: 12, borderRadius: 8, flex: 0.45, alignItems: 'center' },
  btnCancelFull: { backgroundColor: '#F5F5F5', padding: 15, borderRadius: 8, marginTop: 10 },
  historialCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 1 },
  tipoTag: { fontSize: 10, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  fechaHistorial: { fontSize: 11, color: '#999' },
  historialMainText: { fontSize: 15, fontWeight: 'bold', marginVertical: 5, color: '#333' },
  historialDestino: { fontSize: 13, color: '#666' }
});

export default InventarioScreen;