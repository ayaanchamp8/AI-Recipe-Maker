import { useState, useEffect } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, signInWithGoogle, logout } from "../firebase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      
      if (u) {
        // Track/update user in Firestore on auth state realization
        try {
          await setDoc(doc(db, "users", u.uid), {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName,
            photoURL: u.photoURL,
            lastLogin: serverTimestamp(),
          }, { merge: true });
        } catch (e) {
          console.error("Failed to track active user session:", e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  return {
    user,
    loading,
    login: signInWithGoogle,
    logout,
  };
}
