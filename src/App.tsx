import React, { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth, db } from "./firebase";
import type { Persona } from "./types";
import { useAuthSync } from "./app/useAuthSync";
import { AuthGate } from "./app/AuthGate";
import { AppShell } from "./app/AppShell";
import { FavoritesDrawer } from "./components/FavoritesDrawer";
import { HistoryDrawer } from "./components/HistoryDrawer";

export default function App() {
  const { user } = useAuthSync();
  const [favorites, setFavorites] = useState<Record<string, Persona>>({});
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedFavoritePersona, setSelectedFavoritePersona] = useState<Persona | null>(null);

  useEffect(() => {
    let unsubscribeFavorites: () => void;

    if (user) {
      const favRef = collection(db, `users/${user.uid}/favoritePersonas`);
      unsubscribeFavorites = onSnapshot(favRef, (snapshot) => {
        const newFavs: Record<string, Persona> = {};
        snapshot.docs.forEach((doc) => {
          newFavs[doc.data().name] = { id: doc.id, ...doc.data() } as Persona;
        });
        setFavorites(newFavs);
      });
    }

    return () => {
      if (unsubscribeFavorites) unsubscribeFavorites();
    };
  }, [user]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <AuthGate>
      <AppShell
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        favorites={favorites}
        selectedChatId={selectedChatId}
        selectedFavoritePersona={selectedFavoritePersona}
      />
      <FavoritesDrawer
        favorites={favorites}
        onSelect={(persona) => {
          setSelectedFavoritePersona(persona);
        }}
      />
      <HistoryDrawer
        onSelectSession={(id) => {
          setSelectedChatId(id);
        }}
      />
    </AuthGate>
  );
}
