import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore'; // IMPORTANTE: Agregado

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // FUNCIÓN ADMINISTRATIVA (Solo se usa una vez)
  const crearGerenteInicial = async () => {
    try {
      setLoading(true);
      // Crea el usuario en Authentication
      const res = await auth().createUserWithEmailAndPassword('gerente@confecciones.com', 'Admin123*');
      
      // Crea el perfil con rol en Firestore usando el UID generado
      await firestore().collection('usuarios').doc(res.user.uid).set({
        nombre: 'Admin Taller',
        rol: 'gerente',
        empresa: 'Taller E&P'
      });
      
      Alert.alert('Éxito', 'Gerente creado. Ahora puedes iniciar sesión.');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingresa todos los campos');
      return;
    }

    setLoading(true);
    try {
      await auth().signInWithEmailAndPassword(email, password);
      navigation.replace('Main');
    } catch (error) {
      let detail = 'Ocurrió un error al iniciar sesión';
      if (error.code === 'auth/user-not-found') detail = 'Usuario no registrado';
      if (error.code === 'auth/wrong-password') detail = 'Contraseña incorrecta';
      Alert.alert('Error de Acceso', detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Confecciones E & P</Text>
      <Text style={styles.subtitle}>Control de Producción</Text>

      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Ingresar</Text>
        )}
      </TouchableOpacity>

      {/* BOTÓN TEMPORAL: Úsalo una vez y luego bórralo del código */}
      <TouchableOpacity 
        style={{ marginTop: 20 }} 
        onPress={crearGerenteInicial}
      >
        <Text style={{ color: '#097678', textAlign: 'center', fontSize: 12 }}>
          [ Admin: Crear Gerente Inicial ]
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6', justifyContent: 'center', padding: 30 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#097678', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40 },
  input: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#DDD' },
  button: { backgroundColor: '#097678', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});

export default LoginScreen;