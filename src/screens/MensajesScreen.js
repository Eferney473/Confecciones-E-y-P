import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TextInput, 
  TouchableOpacity, KeyboardAvoidingView, Platform 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const MensajesScreen = () => {
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const user = auth().currentUser;

  // 1. ESCUCHA DE MENSAJES EN TIEMPO REAL
  useEffect(() => {
    const subscriber = firestore()
      .collection('chats')
      .orderBy('fecha', 'desc') // Los más recientes abajo (usamos inverted en FlatList)
      .onSnapshot(querySnapshot => {
        const data = [];
        querySnapshot?.forEach(doc => {
          data.push({ ...doc.data(), id: doc.id });
        });
        setMensajes(data);
      });
    return () => subscriber();
  }, []);

  // 2. ENVIAR MENSAJE
  const enviarMensaje = async () => {
    if (nuevoMensaje.trim().length === 0) return;

    try {
      await firestore().collection('chats').add({
        texto: nuevoMensaje,
        remitente: user.email,
        nombre: user.email.split('@')[0], // Nombre simplificado
        fecha: firestore.FieldValue.serverTimestamp()
      });
      setNuevoMensaje('');
    } catch (error) {
      console.error(error);
    }
  };

  const renderItem = ({ item }) => {
    const esMio = item.remitente === user.email;

    return (
      <View style={[styles.bubble, esMio ? styles.bubbleMe : styles.bubbleThem]}>
        {!esMio && <Text style={styles.senderName}>{item.nombre}</Text>}
        <Text style={[styles.messageText, esMio && { color: '#FFF' }]}>{item.texto}</Text>
        <Text style={[styles.timeText, esMio && { color: '#D1E8E8' }]}>
          {item.fecha?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        data={mensajes}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        inverted // Esto hace que el scroll empiece desde abajo
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Escribe un mensaje a BodyLine..."
          placeholderTextColor='#666'
          color='#000'
          style={styles.input}
          value={nuevoMensaje}
          onChangeText={setNuevoMensaje}
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={enviarMensaje}>
          <Icon name="send" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  listContent: { paddingHorizontal: 15, paddingVertical: 20 },
  bubble: {
    padding: 12,
    borderRadius: 15,
    marginBottom: 10,
    maxWidth: '80%',
    elevation: 1,
  },
  bubbleMe: {
    backgroundColor: '#097678',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2,
  },
  bubbleThem: {
    backgroundColor: '#FFF',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2,
  },
  senderName: { fontSize: 10, fontWeight: 'bold', color: '#097678', marginBottom: 4, textTransform: 'capitalize' },
  messageText: { fontSize: 15, color: '#2D3436' },
  timeText: { fontSize: 9, color: '#999', textAlign: 'right', marginTop: 4 },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#FFF',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EEE'
  },
  input: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    maxHeight: 100
  },
  sendBtn: {
    backgroundColor: '#097678',
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center'
  }
});

export default MensajesScreen;