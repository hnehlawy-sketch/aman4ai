import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, getDocs, query, where, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../../firebase'; // Assuming firebase.ts exists in root or similar

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private firestore = db;

  async getPricing() {
    // Mock or fetch from Firestore
    return {
      pro: { monthly: { usd: 5, syp: 75000 }, yearly: { usd: 50, syp: 750000 } },
      premium: { monthly: { usd: 10, syp: 150000 }, yearly: { usd: 100, syp: 1500000 } }
    };
  }

  async getPaymentMethods() {
    try {
      const snapshot = await getDocs(collection(this.firestore, 'paymentMethods'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error('Error fetching payment methods', e);
      return [];
    }
  }

  async uploadPaymentReceipt(userId: string, file: File) {
    const storage = getStorage();
    const storageRef = ref(storage, `receipts/${userId}/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  }

  async submitPaymentRequest(transactionId: string, receiptUrl: string, planDetails: string) {
    return await addDoc(collection(this.firestore, 'paymentRequests'), {
      transactionId,
      receiptUrl,
      planDetails,
      status: 'pending',
      timestamp: Date.now()
    });
  }
}
