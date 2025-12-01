
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  reload,
} from 'firebase/auth';
import { auth, provider, signInWithPopup, db, doc, setDoc, saveUserProfile } from '../firebase';

// AuthContext provides: currentUser, loading, register, login, logout, loginWithGoogle,
// sendOTP, verifyOTP

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Register a new user and save profile to Firestore
  const register = async (email, password, profile = {}) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    // Save minimal profile and merge additional fields
    try {
      await saveUserProfile(user);
      if (profile && Object.keys(profile).length) {
        await setDoc(doc(db, 'users', user.uid), profile, { merge: true });
      }
    } catch (err) {
      console.warn('Failed to save user profile:', err);
    }
    return userCredential;
  };

  const login = async (email, password) => {
    return await signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, provider);
    // Save profile on first login
    try {
      if (result?.user) {
        await saveUserProfile(result.user);
      }
    } catch (err) {
      console.warn('Failed to save Google profile:', err);
    }
    return result;
  };

  const logout = async () => {
    return await signOut(auth);
  };

  const sendOTP = async () => {
    if (!auth.currentUser) throw new Error('No authenticated user');
    // Send email verification
    return await sendEmailVerification(auth.currentUser, {
      // Redirect back to app after verification (optional)
      url: process.env.REACT_APP_POST_VERIFICATION_URL || window.location.origin,
    });
  };

  const verifyOTP = async () => {
    if (!auth.currentUser) return false;
    try {
      await reload(auth.currentUser);
      return !!auth.currentUser.emailVerified;
    } catch (err) {
      console.error('verifyOTP error', err);
      return false;
    }
  };

  const value = {
    currentUser,
    loading,
    register,
    login,
    logout,
    loginWithGoogle,
    sendOTP,
    verifyOTP,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}
