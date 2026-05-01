import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, TextInput, TouchableOpacity, 
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const MensajesScreen = () => {
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const user = auth().currentUser;

  useEffect(() => {
    if (!user) return;

    // Escuchar mensajes en tiempo real
    const subscriber = firestore()
      .collection('mensajes')
      .orderBy('fecha', 'desc')
      .onSnapshot(querySnapshot => {
        if (!querySnapshot) return;

        const msgs = [];
        querySnapshot.forEach(doc => {
          msgs.push({ ...doc.data(), id: doc.id });
          
          // Lógica del "Visto": Si el mensaje es para mí y no está leído, marcarlo
          const data = doc.data();
          if (data.enviadoPor !== user.uid && data.leido === false) {
            firestore().collection('mensajes').doc(doc.id).update({ leido: true });
          }
        });
        setMensajes(msgs);
      }, error => {
        console.log("Error Firestore:", error);
      });

    return () => subscriber();
  }, [user]);

  const enviarMensaje = async () => {
    if (nuevoMensaje.trim().length === 0) return;

    const mensajeData = {
      texto: nuevoMensaje,
      enviadoPor: user.uid,
      userName: user.email.split('@')[0],
      fecha: firestore.FieldValue.serverTimestamp(),
      leido: false,
    };

    try {
      await firestore().collection('mensajes').add(mensajeData);
      setNuevoMensaje('');
    } catch (e) {
      console.log("Error al enviar:", e);
    }
  };

  const renderItem = ({ item }) => {
    const esMio = item.enviadoPor === user.uid;
    
    // VALIDACIÓN CRÍTICA DE FECHA:
    // Si el mensaje se acaba de enviar, item.fecha es null momentáneamente
    let hora = "...";
    if (item.fecha && item.fecha.toDate) {
      hora = item.fecha.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return (
      <View style={[styles.msgContainer, esMio ? styles.miMsg : styles.otroMsg]}>
        {!esMio && <Text style={styles.senderName}>{item.userName}</Text>}
        <Text style={styles.textMsg}>{item.texto}</Text>
        <View style={styles.footerMsg}>
          <Text style={styles.horaText}>{hora}</Text>
          {esMio && (
            <Icon 
              name="check-all" 
              size={16} 
              color={item.leido ? "#34B7F1" : "#999"} 
              style={{ marginLeft: 5 }}
            />
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20: 100}
      >
        <FlatList
          data={mensajes}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          inverted
          contentContainerStyle={{ paddingHorizontal: 15, paddingVertical: 10 }}
        />

        <View style={styles.inputArea}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Escribe un mensaje..."
              placeholderTextColor="#666"
              value={nuevoMensaje}
              onChangeText={setNuevoMensaje}
              multiline
            />
            <TouchableOpacity style={styles.sendBtn} onPress={enviarMensaje}>
              <Icon name="send" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E5DDD5' },
  msgContainer: { padding: 8, borderRadius: 10, marginBottom: 8, maxWidth: '85%' },
  miMsg: { alignSelf: 'flex-end', backgroundColor: '#DCF8C6', borderTopRightRadius: 0 },
  otroMsg: { alignSelf: 'flex-start', backgroundColor: '#FFF', borderTopLeftRadius: 0 },
  senderName: { fontSize: 12, fontWeight: 'bold', color: '#097678', marginBottom: 2 },
  textMsg: { fontSize: 16, color: '#000' },
  footerMsg: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 2 },
  horaText: { fontSize: 10, color: '#666' },
  inputArea: { backgroundColor: '#FFF', paddingVertical: 5, paddingHorizontal: 10 },
  inputContainer: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#F0F0F0', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, marginRight: 8, maxHeight: 100, color: '#000' },
  sendBtn: { backgroundColor: '#097678', width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
});

export default MensajesScreen;