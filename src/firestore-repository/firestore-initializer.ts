import 'reflect-metadata'

import * as admin from 'firebase-admin'
import { container } from 'tsyringe'

export const FIRESTORE_INSTANCE = 'firestore-instance'

export type FirebaseUser = admin.auth.UserRecord
export const { FieldValue } = admin.firestore

export type InitializeDataSourceOptions = {
  serviceAccountConfig?: string
}

export async function initializeFirestore(options: InitializeDataSourceOptions = {}) {
  const serviceAccountConfig = options.serviceAccountConfig ?? process.env.SERVICE_ACCOUNT_CONFIG
  if (serviceAccountConfig) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const config = require(serviceAccountConfig)
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.project_id,
        privateKey: config.private_key,
        clientEmail: config.client_email,
      }),
    })
  } else {
    // auto resolved from Google Cloud
    admin.initializeApp()
  }

  const firestore = admin.firestore()
  container.registerInstance(FIRESTORE_INSTANCE, firestore)
  return firestore
}

export function resolveFirestore(): admin.firestore.Firestore {
  return container.resolve(FIRESTORE_INSTANCE)
}
