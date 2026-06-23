import { useState, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  onAuthStateChanged,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  getRedirectResult,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signOut,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { User } from '../types';

function buildTenantId(uid: string): string {
  return `tenant-${uid.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 18)}`;
}

function buildSlug(value: string, fallback: string): string {
  const source = value.trim() || fallback;
  const normalized = source
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  return normalized || fallback.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

interface UseAuthReturn {
  firebaseUser: FirebaseUser | null;
  appUser: User | null;
  setAppUser: Dispatch<SetStateAction<User | null>>;
  isAuthLoading: boolean;
  selectedTenantId: string;
  setSelectedTenantId: Dispatch<SetStateAction<string>>;
  handleSignInWithGoogle: () => Promise<void>;
  handleSignInWithEmail: (email: string, password: string) => Promise<void>;
  handleCreateAccountWithEmail: (email: string, password: string) => Promise<void>;
  handleSignOut: (opts: { isDemoMode: boolean; onDemoSignOut: () => void }) => Promise<void>;
  handleForgotPassword: (email: string) => Promise<void>;
  getAuthToken: () => Promise<string | null>;
}

export function useAuth(triggerToast: (msg: string) => void): UseAuthReturn {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  // Handle Google redirect result on mount
  useEffect(() => {
    if (!auth) return;
    getRedirectResult(auth).catch((err) => {
      console.error(err);
      triggerToast('No se pudo completar el inicio de sesión con Google.');
    });
  }, []);

  // Firebase auth state listener & first workspace provisioning
  useEffect(() => {
    if (!auth) {
      // ponytail: sin Firebase la app sigue usable (landing + demo); solo se desactiva el login real.
      console.error('Firebase no configurado: falta VITE_FIREBASE_API_KEY. Login deshabilitado.');
      setIsAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        triggerToast('Cuenta conectada. Preparando tu espacio de trabajo...');
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userDocRef).catch((err) => {
            handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
            throw err;
          });

          let resolvedUser: User;
          let resolvedTenantId = buildTenantId(user.uid);

          if (userSnap.exists()) {
            resolvedUser = userSnap.data() as User;
            resolvedTenantId = resolvedUser.tenantId;
          } else {
            // H05: no derivar el nombre del email (genera "prueba.cro.elena"). Si no hay
            // displayName real (registro por email), dejar vacío para que el onboarding pida "Tu nombre".
            const ownerName = user.displayName || '';
            const now = new Date();
            const createdAt = now.toISOString();
            const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

            await setDoc(doc(db, 'tenants', resolvedTenantId), {
              id: resolvedTenantId,
              name: '',
              address: '',
              phone: '',
              city: '',
              email: user.email || '',
              onboardingCompleted: false,
              createdAt,
              updatedAt: createdAt,
              trialEndsAt,
              subscriptionStatus: 'trialing',
              publicBookingEnabled: true,
              slug: buildSlug(resolvedTenantId, resolvedTenantId),
              bookingNoticeHours: 2,
              bookingSlotMinutes: 30,
            }).catch((err) =>
              handleFirestoreError(err, OperationType.CREATE, `tenants/${resolvedTenantId}`)
            );

            const newUserDoc: User = {
              id: user.uid,
              email: user.email || '',
              name: ownerName,
              role: 'Propietaria',
              tenantId: resolvedTenantId,
              status: 'Activo',
              emailVerified: user.emailVerified,
              createdAt,
              onboardingCompleted: false,
              photoURL: user.photoURL || '',
              lastLoginAt: createdAt,
            };

            await setDoc(userDocRef, newUserDoc).catch((err) =>
              handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`)
            );

            resolvedUser = newUserDoc;
            triggerToast('Tu cuenta y tu salón ya tienen un espacio propio.');
          }

          if (userSnap.exists()) {
            const updatedUser = {
              ...resolvedUser,
              lastLoginAt: new Date().toISOString(),
              photoURL: user.photoURL || resolvedUser.photoURL || '',
            };
            await setDoc(userDocRef, updatedUser).catch((err) =>
              handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`)
            );
            resolvedUser = updatedUser;
          }

          const tenantRef = doc(db, 'tenants', resolvedTenantId);
          const tenantSnap = await getDoc(tenantRef).catch((err) => {
            handleFirestoreError(err, OperationType.GET, `tenants/${resolvedTenantId}`);
            throw err;
          });
          if (tenantSnap.exists()) {
            const tenantData = tenantSnap.data();
            const bookingDefaults: Record<string, unknown> = {};
            if (!tenantData.slug) bookingDefaults.slug = buildSlug(tenantData.name || resolvedUser.name, resolvedTenantId);
            if (!('publicBookingEnabled' in tenantData)) bookingDefaults.publicBookingEnabled = true;
            if (!tenantData.bookingNoticeHours) bookingDefaults.bookingNoticeHours = 2;
            if (!tenantData.bookingSlotMinutes) bookingDefaults.bookingSlotMinutes = 30;
            if (Object.keys(bookingDefaults).length > 0) {
              await setDoc(tenantRef, {
                ...bookingDefaults,
                updatedAt: new Date().toISOString(),
              }, { merge: true }).catch((err) =>
                handleFirestoreError(err, OperationType.UPDATE, `tenants/${resolvedTenantId}`)
              );
            }
          }

          setAppUser(resolvedUser);
          setSelectedTenantId(resolvedTenantId);
        } catch (e) {
          console.error('Firebase startup or account provisioning error: ', e);
          triggerToast('No se pudo preparar tu cuenta. Revisa permisos de Firebase.');
        }
      } else {
        setAppUser(null);
        setSelectedTenantId('');
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignInWithGoogle = async () => {
    if (
      window.location.hostname === 'elena-os.web.app' &&
      import.meta.env.VITE_FIREBASE_PROJECT_ID !== 'elena-39ea1'
    ) {
      triggerToast(
        'Falta conectar esta web al proyecto Firebase Elena. Revisa las variables VITE_FIREBASE_* en el entorno.'
      );
      return;
    }
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await setPersistence(auth, browserLocalPersistence);
    await signInWithRedirect(auth, provider).catch((err) => {
      const message =
        err?.code === 'auth/unauthorized-domain'
          ? 'Este dominio no está autorizado en Firebase Authentication.'
          : 'Error de autenticación con Google';
      triggerToast(message);
      throw err;
    });
  };

  const handleSignInWithEmail = async (email: string, password: string) => {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth, email.trim(), password).catch((err) => {
      const message =
        err?.code === 'auth/invalid-credential'
          ? 'Email o contraseña incorrectos.'
          : 'No se pudo iniciar sesión con email.';
      triggerToast(message);
      throw err;
    });
  };

  const handleCreateAccountWithEmail = async (email: string, password: string) => {
    await setPersistence(auth, browserLocalPersistence);
    await createUserWithEmailAndPassword(auth, email.trim(), password).catch((err) => {
      const message =
        err?.code === 'auth/email-already-in-use'
          ? 'Ya existe una cuenta con ese email.'
          : err?.code === 'auth/weak-password'
          ? 'La contraseña debe tener al menos 6 caracteres.'
          : 'No se pudo crear la cuenta con email.';
      triggerToast(message);
      throw err;
    });
  };

  const handleSignOut = async ({
    isDemoMode,
    onDemoSignOut,
  }: {
    isDemoMode: boolean;
    onDemoSignOut: () => void;
  }) => {
    if (isDemoMode) {
      onDemoSignOut();
      triggerToast('Has salido de la demo aislada.');
      return;
    }
    await signOut(auth).catch((err) => {
      triggerToast('Error al cerrar sesión');
      throw err;
    });
    triggerToast('Base de Datos Desconectada de la Nube.');
  };

  const handleForgotPassword = async (email: string) => {
    if (!email.trim()) {
      triggerToast('Introduce tu email para recuperar la contraseña.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      triggerToast('Correo de recuperación enviado. Revisa tu bandeja de entrada.');
    } catch (err: any) {
      const message =
        err?.code === 'auth/user-not-found'
          ? 'No existe ninguna cuenta con ese email.'
          : 'No se pudo enviar el correo de recuperación.';
      triggerToast(message);
      throw err;
    }
  };

  const getAuthToken = async (): Promise<string | null> => {
    return firebaseUser ? firebaseUser.getIdToken() : null;
  };

  return {
    firebaseUser,
    appUser,
    setAppUser,
    isAuthLoading,
    selectedTenantId,
    setSelectedTenantId,
    handleSignInWithGoogle,
    handleSignInWithEmail,
    handleCreateAccountWithEmail,
    handleSignOut,
    handleForgotPassword,
    getAuthToken,
  };
}
