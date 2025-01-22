import 'reflect-metadata'

import { Bucket, Storage } from '@google-cloud/storage'
import * as admin from 'firebase-admin'
import { container } from 'tsyringe'

export const FIRESTORE_INSTANCE = 'firestore-instance'

export type FirebaseUser = admin.auth.UserRecord
export const { FieldValue } = admin.firestore

export type InitializeFirestoreOptions = {
  serviceAccountConfig?: string
  storageBucket?: string
}

export async function initializeFirestore(options: InitializeFirestoreOptions = {}) {
  const { serviceAccountConfig, storageBucket } = options
  admin.initializeApp({
    // {} will work of GOOGLE_APPLICATION_CREDENTIALS is set in the environment
    ...(serviceAccountConfig ? { credential: admin.credential.cert(serviceAccountConfig) } : {}),

    // if storageBucket is not provided, it will be inferred from the service account config
    ...(storageBucket ? { storageBucket } : {}),
  })
  const firestore = admin.firestore()
  firestore.settings({ ignoreUndefinedProperties: true })
  container.registerInstance(FIRESTORE_INSTANCE, firestore)
  if (storageBucket) {
    const storage = new Storage()
    container.registerInstance(Bucket, storage.bucket(storageBucket))
  }
}

export function resolveFirestore(): admin.firestore.Firestore {
  return container.resolve(FIRESTORE_INSTANCE)
}

export function getDefaultStorageBucket() {
  return container.resolve(Bucket)
}
