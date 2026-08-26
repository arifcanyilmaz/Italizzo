// MongoDB baglanti yardimcisi (serverless icin onbellekli).
//
// Netlify Functions her cagrida ayni Lambda ornegini yeniden kullanabilir;
// bu yuzden istemciyi modul kapsaminda bir kez olusturup tekrar kullaniriz.
// Boylece her istekte yeni baglanti acilmaz.

import { MongoClient } from 'mongodb'

let clientPromise = null

export function getDb() {
  const uri = process.env.MONGODB_URI
  const dbName = process.env.MONGODB_DB || 'italizzo'

  if (!uri) {
    throw new Error(
      'MONGODB_URI ortam değişkeni tanımlı değil. Netlify > Site settings > Environment variables kısmından ekleyin.',
    )
  }

  if (!clientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 8000,
    })
    clientPromise = client.connect()
  }

  return clientPromise.then((client) => client.db(dbName))
}
