import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, setDoc, getDocFromServer, serverTimestamp } from "firebase/firestore";
import * as Sentry from "@sentry/react";
import { auth, db } from "../firebase";
import { handleFirestoreError, OperationType } from "../lib/firestoreUtils";

export function useAuthSync() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        let retries = 3;
        while (retries > 0) {
          try {
            const userRef = doc(db, "users", currentUser.uid);
            const userSnap = await getDocFromServer(userRef);
            if (!userSnap.exists()) {
              await setDoc(userRef, {
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName,
                photoURL: currentUser.photoURL,
                createdAt: serverTimestamp(),
              });
            }
            break;
          } catch (error) {
            retries--;
            if (retries === 0) {
              if (error instanceof Error && error.message.includes("the client is offline")) {
                console.error("CRITICAL: Firestore is offline.");
              }
              handleFirestoreError(
                error,
                OperationType.CREATE,
                `users/${currentUser.uid}`
              );
            } else {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }
      }
      setUser(currentUser);
      if (currentUser) {
        Sentry.setUser({ id: currentUser.uid });
      } else {
        Sentry.setUser(null);
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  return { user, authReady };
}
