import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, TextInput, TouchableOpacity, 
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, StatusBar 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const MensajesScreen = ({ navigation }) => {
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const user = auth().currentUser;

  useEffect(() => {
    if (!user) return;

    const subscriber = firestore()
      .collection('mensajes')
      .orderBy('fecha', 'desc')
      .onSnapshot(querySnapshot => {
        if (!querySnapshot) return;
        const msgs = [];
        querySnapshot.forEach(doc => {
          msgs.push({ ...doc.data(), id: doc.id });
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
    let hora = "...";
    if (item.fecha && item.fecha.toDate) {
      hora = item.fecha.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return (
      <View style={[styles.msgWrapper, esMio ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
        <View style={[styles.msgContainer, esMio ? styles.miMsg : styles.otroMsg]}>
          {!esMio && <Text style={styles.senderName}>{item.userName}</Text>}
          <Text style={[styles.textMsg, esMio && { color: '#FFF' }]}>{item.texto}</Text>
          <View style={styles.footerMsg}>
            <Text style={[styles.horaText, esMio && { color: '#B2DFDB' }]}>{hora}</Text>
            {esMio && (
              <Icon 
                name="check-all" 
                size={15} 
                color={item.leido ? "#34B7F1" : "#B2DFDB"} 
                style={{ marginLeft: 4 }} 
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* El behavior 'padding' en iOS y 'height' en Android suele ser la combinación ganadora */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 110} 
      >
        <FlatList
          data={mensajes}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          inverted
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.inputArea}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Escribe un mensaje..."
              placeholderTextColor="#999"
              value={nuevoMensaje}
              onChangeText={setNuevoMensaje}
              multiline
            />
            {/* AQUÍ ESTÁ EL BOTÓN DE ENVIAR CON SU FUNCIÓN RESTAURADA */}
            <TouchableOpacity 
              style={[styles.sendBtn, !nuevoMensaje.trim() && { opacity: 0.5 }]} 
              onPress={enviarMensaje}
              disabled={!nuevoMensaje.trim()}
            >
              <Icon name="send" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F2F2F2' // Gris sólido profesional
  },
  listContent: { 
    paddingHorizontal: 12, 
    paddingVertical: 20 
  },
  msgWrapper: { 
    width: '100%', 
    marginBottom: 10 
  },
  msgContainer: { 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    maxWidth: '80%', 
    borderRadius: 15 
  },
  miMsg: { 
    backgroundColor: '#097678', 
    borderBottomRightRadius: 2, 
    elevation: 2 
  },
  otroMsg: { 
    backgroundColor: '#FFF', 
    borderBottomLeftRadius: 2, 
    elevation: 1 
  },
  textMsg: { fontSize: 15, color: '#333' },
  senderName: { fontSize: 10, fontWeight: 'bold', color: '#097678', marginBottom: 2 },
  footerMsg: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4, alignItems: 'center' },
  horaText: { fontSize: 9, color: '#999' },
  inputArea: { 
    paddingHorizontal: 10, 
    paddingVertical: 10, 
    backgroundColor: '#FFF', 
    borderTopWidth: 1,
    borderTopColor: '#EEE'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  input: { 
    flex: 1, 
    maxHeight: 100, 
    color: '#333', 
    fontSize: 16,
    paddingVertical: 8
  },
  sendBtn: {
    backgroundColor: '#097678',
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
});

export default MensajesScreen;