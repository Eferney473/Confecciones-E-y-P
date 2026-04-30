import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TextInput, 
  TouchableOpacity, KeyboardAvoidingView, Platform, SafeAreaView 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useHeaderHeight } from '@react-navigation/elements'; // Opcional pero recomendado

const MensajesScreen = () => {
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const user = auth().currentUser;
  const headerHeight = useHeaderHeight(); // Detecta la altura del header azul

  useEffect(() => {
    const subscriber = firestore()
      .collection('chats')
      .orderBy('fecha', 'desc')
      .onSnapshot(snap => {
        const data = [];
        snap?.forEach(doc => data.push({ ...doc.data(), id: doc.id }));
        setMensajes(data);
      });
    return () => subscriber();
  }, []);

  const enviarMensaje = async () => {
    if (nuevoMensaje.trim().length === 0) return;
    try {
      await firestore().collection('chats').add({
        texto: nuevoMensaje,
        remitenteId: user.uid,
        nombre: user.email.split('@')[0],
        fecha: firestore.FieldValue.serverTimestamp()
      });
      setNuevoMensaje('');
    } catch (e) { console.log(e); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F7F6' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        // Este offset es vital: considera el header y el tab bar
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight + 60 : headerHeight + 20}
      >
        <View style={{ flex: 1 }}>
          <FlatList
            data={mensajes}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={[
                styles.bubble, 
                item.remitenteId === user.uid ? styles.bubbleMe : styles.bubbleThem
              ]}>
                <Text style={[styles.text, item.remitenteId === user.uid && {color: '#FFF'}]}>
                  {item.texto}
                </Text>
              </View>
            )}
            inverted
            contentContainerStyle={{ padding: 15 }}
          />

          <View style={styles.inputArea}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Escribe un mensaje..."
                value={nuevoMensaje}
                onChangeText={setNuevoMensaje}
                multiline
                placeholderTextColor="#999"
              />
              <TouchableOpacity style={styles.sendBtn} onPress={enviarMensaje}>
                <Icon name="send" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  bubble: { padding: 12, borderRadius: 15, marginBottom: 8, maxWidth: '80%' },
  bubbleMe: { backgroundColor: '#097678', alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  bubbleThem: { backgroundColor: '#FFF', alignSelf: 'flex-start', borderBottomLeftRadius: 2 },
  text: { fontSize: 15, color: '#333' },
  inputArea: { padding: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#EEE' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2F5', borderRadius: 25, paddingHorizontal: 15 },
  input: { flex: 1, color: '#000', maxHeight: 80, paddingVertical: 10 },
  sendBtn: { backgroundColor: '#097678', width: 35, height: 35, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginLeft: 10 }
});

export default MensajesScreen;