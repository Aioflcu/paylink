import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, sendEmailVerification, reload } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Record login history and device information for fraud detection
  const recordLoginEvent = async (userId, loginMethod = 'email') => {
    try {
      // Get user's location (if available)
      let location = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              enableHighAccuracy: false
            });
          });
          location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
        } catch (error) {
          console.log('Could not get location:', error);
        }
      }

      // Generate device fingerprint
      const deviceFingerprint = await generateDeviceFingerprint();

      // Record login event
      await addDoc(collection(db, 'loginHistory'), {
        userId,
        timestamp: new Date(),
        loginMethod,
        location,
        ipAddress: null, // Would need server-side implementation
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          fingerprint: deviceFingerprint
        },
        success: true
      });

      // Update or create device registry
      await updateDeviceRegistry(userId, deviceFingerprint);

      // Update user's last login
      await updateDoc(doc(db, 'users', userId), {
        lastLogin: new Date(),
        lastLoginLocation: location
      });

    } catch (error) {
      console.error('Error recording login event:', error);
    }
  };

  // Generate a simple device fingerprint
  const generateDeviceFingerprint = async () => {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      !!window.sessionStorage,
      !!window.localStorage,
      !!window.indexedDB,
      navigator.platform
    ];

    const fingerprint = components.join('|');
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  };

  // Update device registry for user
  const updateDeviceRegistry = async (userId, deviceFingerprint) => {
    try {
      const deviceRef = collection(db, 'userDevices');
      const q = query(deviceRef, where('userId', '==', userId), where('fingerprint', '==', deviceFingerprint));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // New device - register it
        await addDoc(collection(db, 'userDevices'), {
          userId,
          fingerprint: deviceFingerprint,
          firstSeen: new Date(),
          lastSeen: new Date(),
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language
          },
          trusted: true // Mark as trusted for now
        });
      } else {
        // Existing device - update last seen
        const deviceDoc = querySnapshot.docs[0];
        await updateDoc(deviceDoc.ref, {
          lastSeen: new Date()
        });
      }
    } catch (error) {
      console.error('Error updating device registry:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch additional user data from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setCurrentUser({ ...user, ...userDoc.data() });
          } else {
            setCurrentUser(user);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setCurrentUser(user);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email, password, userData) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Save additional user data to Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      ...userData,
      createdAt: new Date(),
      walletBalance: 0,
      transactionPIN: null, // Will be set later
    });
    return userCredential;
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  const logout = () => {
    return signOut(auth);
  };

  const updateUserProfile = async (userData) => {
    if (currentUser) {
      await setDoc(doc(db, 'users', currentUser.uid), userData, { merge: true });
      setCurrentUser({ ...currentUser, ...userData });
    }
  };

  const sendOTP = async () => {
    if (auth.currentUser && !auth.currentUser.emailVerified) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const verifyOTP = async () => {
    if (auth.currentUser) {
      await reload(auth.currentUser);
      return auth.currentUser.emailVerified;
    }
    return false;
  };

  const setPIN = async (pin) => {
    if (currentUser) {
      await updateDoc(doc(db, 'users', currentUser.uid), { transactionPIN: pin });
      setCurrentUser({ ...currentUser, transactionPIN: pin });
    }
  };

  const verifyPIN = async (pin) => {
    if (currentUser) {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const storedPIN = userDoc.data().transactionPIN;
        return storedPIN === pin;
      }
    }
    return false;
  };

  const value = {
    currentUser,
    login,
    register,
    loginWithGoogle,
    logout,
    updateUserProfile,
    sendOTP,
    verifyOTP,
    setPIN,
    verifyPIN,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
