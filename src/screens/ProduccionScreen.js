import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, 
  Modal, SafeAreaView, Alert 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';

const ProduccionScreen = () => {
  const [remisiones, setRemisiones] = useState([]);
  const [maquinas, setMaquinas] = useState(['Presilladora', 'Plana', 'Fileteadora', 'Recubridora', 'Ojaladora']);
  const [modalMaquinaVisible, setModalMaquinaVisible] = useState(false);
  const [selectedRemision, setSelectedRemision] = useState(null);

  // 1. CARGA DE DATOS EN TIEMPO REAL
  useEffect(() => {
  const subscriber = firestore()
    .collection('remisiones')
    // Ordenamos por fecha para que las nuevas aparezcan arriba
    .orderBy('fechaCreacion', 'desc') 
    .onSnapshot(querySnapshot => {
      const data = [];
      querySnapshot?.forEach(doc => {
        const docData = doc.data();
        // Solo mostramos en producción si tiene un estado válido
        if (docData.estadoProduccion) {
          data.push({ ...docData, id: doc.id });
        }
      });
      setRemisiones(data);
    }, error => {
        console.log("Error en tiempo real: ", error);
    });
    
  return () => subscriber();
}, []);

  // 2. FUNCIONES DE ACTUALIZACIÓN
  const actualizarEstado = async (id, nuevoEstado) => {
    await firestore().collection('remisiones').doc(id).update({
      estadoProduccion: nuevoEstado
    });
  };

  const asignarMaquina = async (maquina) => {
    if (selectedRemision) {
      await firestore().collection('remisiones').doc(selectedRemision.id).update({
        maquinaActual: maquina,
        estadoProduccion: 'En Proceso' // Al asignar máquina, pasa a estar en proceso
      });
      setModalMaquinaVisible(false);
    }
  };

  // 3. RENDER DE TARJETAS (Basado en tu imagen de referencia)
  const renderItem = ({ item }) => {
    // Configuración del semáforo
    const getConfig = (estado) => {
      switch(estado) {
        case 'En Proceso': return { color: '#F1C40F', label: 'EN PROCESO' };
        case 'Terminado': return { color: '#2ECC71', label: 'TERMINADO' };
        case 'StandBy': return { color: '#E67E22', label: 'STANDBY' };
        default: return { color: '#BDC3C7', label: 'PENDIENTE' };
      }
    };

    const config = getConfig(item.estadoProduccion);

    return (
      <View style={styles.card}>
        {/* Barra de Estado (Semáforo) */}
        <View style={[styles.statusBanner, { backgroundColor: config.color }]}>
          <Text style={styles.statusHeaderText}>
            <Icon name="circle" size={10} /> {config.label}
          </Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.rowInfo}>
            <View>
              <Text style={styles.clienteTitle}>{item.cliente}</Text>
              <Text style={styles.subText}>
                {item.referencias?.length > 1 
                  ? `${item.referencias.length} Referencias` 
                  : `Ref: ${item.referencias?.[0]?.ref || 'N/A'}`} | #{item.numero}
              </Text>
            </View>
           <Text style={styles.cantTotal}>{item.totalPrendas || 0} unds</Text>
          </View>

          {/* Caja de Máquina Actual */}
          <View style={styles.machineBox}>
            <Icon name="engine" size={20} color="#636e72" />
            <Text style={styles.machineText}> Máquina: {item.maquinaActual || 'Pendiente'}</Text>
          </View>

          {/* Botones de Acción inferior */}
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={() => { setSelectedRemision(item); setModalMaquinaVisible(true); }}
            >
              <Icon name="swap-horizontal" size={22} color="#3498DB" />
              <Text style={styles.actionLabel}>Máquina</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={() => actualizarEstado(item.id, 'StandBy')}
            >
              <Icon name="pause-circle-outline" size={22} color="#E67E22" />
              <Text style={styles.actionLabel}>StandBy</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={() => actualizarEstado(item.id, 'Terminado')}
            >
              <Icon name="check-all" size={22} color="#2ECC71" />
              <Text style={styles.actionLabel}>Listo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Panel de Producción</Text>
        <Text style={styles.subtitle}>Gestión de procesos en taller</Text>
      </View>

      <FlatList 
        data={remisiones}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 15 }}
      />

      {/* MODAL DE SELECCIÓN DE MÁQUINA */}
      <Modal visible={modalMaquinaVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Asignar a Máquina</Text>
            {maquinas.map((m, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.maquinaOption}
                onPress={() => asignarMaquina(m)}
              >
                <Text style={styles.maquinaOptionText}>{m}</Text>
                <Icon name="chevron-right" size={20} color="#CCC" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={styles.btnCerrar} 
              onPress={() => setModalMaquinaVisible(false)}
            >
              <Text style={styles.btnCerrarText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  header: { padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#EEE' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#097678' },
  subtitle: { fontSize: 14, color: '#666' },
  // Estilos Tarjeta
  card: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 20, elevation: 4, overflow: 'hidden', marginHorizontal: 5 },
  statusBanner: { paddingVertical: 5, paddingHorizontal: 15, alignItems: 'center' },
  statusHeaderText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  cardBody: { padding: 15 },
  rowInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clienteTitle: { fontSize: 18, fontWeight: 'bold', color: '#2d3436' },
  subText: { fontSize: 13, color: '#636e72' },
  cantTotal: { fontSize: 18, fontWeight: 'bold', color: '#097678' },
  machineBox: { backgroundColor: '#F8F9F9', padding: 10, borderRadius: 8, marginVertical: 12, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#097678' },
  machineText: { fontSize: 14, fontWeight: '600', color: '#2d3436' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 12 },
  actionBtn: { alignItems: 'center' },
  actionLabel: { fontSize: 11, color: '#636e72', marginTop: 4, fontWeight: '600' },
  // Estilos Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', width: '85%', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#097678', marginBottom: 15, textAlign: 'center' },
  maquinaOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  maquinaOptionText: { fontSize: 16, color: '#2d3436' },
  btnCerrar: { marginTop: 20, padding: 12, alignItems: 'center' },
  btnCerrarText: { color: '#E17055', fontWeight: 'bold' }
});

export default ProduccionScreen;