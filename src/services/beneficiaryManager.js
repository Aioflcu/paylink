import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

class BeneficiaryManager {
  static async addBeneficiary(userId, beneficiaryData) {
    try {
      const beneficiariesRef = collection(db, 'beneficiaries');
      
      // Check if beneficiary already exists
      const q = query(
        beneficiariesRef,
        where('userId', '==', userId),
        where('type', '==', beneficiaryData.type),
        where('details', '==', beneficiaryData.details)
      );
      const existing = await getDocs(q);

      if (!existing.empty) {
        throw new Error('Beneficiary already exists');
      }

      const newBeneficiary = {
        userId,
        nickname: beneficiaryData.nickname,
        type: beneficiaryData.type,
        details: beneficiaryData.details,
        provider: beneficiaryData.provider,
        createdAt: serverTimestamp(),
        lastUsed: null
      };

      const docRef = await addDoc(beneficiariesRef, newBeneficiary);
      return { id: docRef.id, ...newBeneficiary };
    } catch (error) {
      console.error('Error adding beneficiary:', error);
      throw error;
    }
  }

  static async getBeneficiaries(userId, type = null) {
    try {
      const beneficiariesRef = collection(db, 'beneficiaries');
      let q;
      
      if (type) {
        q = query(
          beneficiariesRef,
          where('userId', '==', userId),
          where('type', '==', type)
        );
      } else {
        q = query(beneficiariesRef, where('userId', '==', userId));
      }

      const querySnapshot = await getDocs(q);
      const beneficiaries = [];
      querySnapshot.forEach(doc => {
        beneficiaries.push({ id: doc.id, ...doc.data() });
      });
      
      return beneficiaries.sort((a, b) => 
        (b.lastUsed?.toDate?.() || 0) - (a.lastUsed?.toDate?.() || 0)
      );
    } catch (error) {
      console.error('Error getting beneficiaries:', error);
      return [];
    }
  }

  static async updateBeneficiary(beneficiaryId, userId, updateData) {
    try {
      const beneficiaryRef = doc(db, 'beneficiaries', beneficiaryId);
      const beneficiarySnap = await getDocs(query(
        collection(db, 'beneficiaries'),
        where('__name__', '==', beneficiaryId)
      ));

      if (beneficiarySnap.empty) {
        throw new Error('Beneficiary not found');
      }

      await updateDoc(beneficiaryRef, updateData);
      return { id: beneficiaryId, ...updateData };
    } catch (error) {
      console.error('Error updating beneficiary:', error);
      throw error;
    }
  }

  static async deleteBeneficiary(beneficiaryId, userId) {
    try {
      const beneficiaryRef = doc(db, 'beneficiaries', beneficiaryId);
      await deleteDoc(beneficiaryRef);
      return true;
    } catch (error) {
      console.error('Error deleting beneficiary:', error);
      throw error;
    }
  }

  static async updateLastUsed(beneficiaryId, userId) {
    try {
      const beneficiaryRef = doc(db, 'beneficiaries', beneficiaryId);
      await updateDoc(beneficiaryRef, { lastUsed: serverTimestamp() });
    } catch (error) {
      console.error('Error updating last used:', error);
    }
  }

  static async quickPurchase(userId, beneficiaryId, amount) {
    try {
      const beneficiaryRef = doc(db, 'beneficiaries', beneficiaryId);
      const beneficiarySnap = await getDocs(query(
        collection(db, 'beneficiaries'),
        where('__name__', '==', beneficiaryId)
      ));

      if (beneficiarySnap.empty) {
        throw new Error('Beneficiary not found');
      }

      // Update last used
      await this.updateLastUsed(beneficiaryId, userId);

      // Return empty structure since beneficiary data would come from snapshot
      return { type: 'unknown', amount };
    } catch (error) {
      console.error('Error performing quick purchase:', error);
      throw error;
    }
  }

  static getBeneficiaryTypes() {
    return {
      meter: {
        label: 'Electricity Meter',
        fields: ['meterNumber'],
        providers: ['EKEDC', 'IKEDC', 'AEDC', 'IBEDC', 'PHED', 'JED', 'KAEDCO', 'EEDC']
      },
      cabletv: {
        label: 'Cable TV',
        fields: ['smartcardNumber'],
        providers: ['DSTV', 'GOTV', 'StarTimes', 'Showmax']
      },
      phone: {
        label: 'Phone Number',
        fields: ['phoneNumber'],
        providers: ['MTN', 'Airtel', 'Glo', '9mobile']
      },
      internet: {
        label: 'Internet Account',
        fields: ['accountNumber'],
        providers: ['Spectranet', 'Smile', 'Swift', 'IPNX']
      },
      tax: {
        label: 'Tax ID',
        fields: ['taxId'],
        providers: ['FIRS', 'LIRS', 'State IRS']
      }
    };
  }

  static validateBeneficiaryData(type, data) {
    const types = this.getBeneficiaryTypes();
    const typeConfig = types[type];

    if (!typeConfig) {
      return { valid: false, error: 'Invalid beneficiary type' };
    }

    // Check required fields
    for (const field of typeConfig.fields) {
      if (!data[field]) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }

    // Validate provider
    if (data.provider && !typeConfig.providers.includes(data.provider)) {
      return { valid: false, error: 'Invalid provider for this beneficiary type' };
    }

    // Type-specific validations
    switch (type) {
      case 'meter':
        if (!/^\d{10,13}$/.test(data.meterNumber)) {
          return { valid: false, error: 'Invalid meter number format' };
        }
        break;

      case 'cabletv':
        if (!/^\d{10,12}$/.test(data.smartcardNumber)) {
          return { valid: false, error: 'Invalid smartcard number format' };
        }
        break;

      case 'phone':
        if (!/^(\+234|0)[789]\d{9}$/.test(data.phoneNumber)) {
          return { valid: false, error: 'Invalid phone number format' };
        }
        break;

      case 'internet':
        if (!/^\d{8,15}$/.test(data.accountNumber)) {
          return { valid: false, error: 'Invalid account number format' };
        }
        break;

      case 'tax':
        if (!/^\d{8,15}$/.test(data.taxId)) {
          return { valid: false, error: 'Invalid tax ID format' };
        }
        break;
    }

    return { valid: true };
  }

  static async searchBeneficiaries(userId, searchTerm, type = null) {
    try {
      const beneficiariesRef = collection(db, 'beneficiaries');
      let q;
      
      if (type) {
        q = query(
          beneficiariesRef,
          where('userId', '==', userId),
          where('type', '==', type)
        );
      } else {
        q = query(beneficiariesRef, where('userId', '==', userId));
      }

      const querySnapshot = await getDocs(q);
      const beneficiaries = [];
      const searchLower = searchTerm.toLowerCase();
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        if (
          data.nickname?.toLowerCase().includes(searchLower) ||
          JSON.stringify(data.details).toLowerCase().includes(searchLower)
        ) {
          beneficiaries.push({ id: doc.id, ...data });
        }
      });
      
      return beneficiaries.sort((a, b) => 
        (b.lastUsed?.toDate?.() || 0) - (a.lastUsed?.toDate?.() || 0)
      );
    } catch (error) {
      console.error('Error searching beneficiaries:', error);
      return [];
    }
  }

  static async getFrequentlyUsed(userId, limit = 5) {
    try {
      const beneficiaries = await this.getBeneficiaries(userId);
      return beneficiaries.slice(0, limit);
    } catch (error) {
      console.error('Error getting frequently used beneficiaries:', error);
      return [];
    }
  }

  static async exportBeneficiaries(userId) {
    try {
      const beneficiaries = await this.getBeneficiaries(userId);
      const exportData = beneficiaries.map(b => ({
        nickname: b.nickname,
        type: b.type,
        provider: b.provider,
        details: b.details,
        lastUsed: b.lastUsed
      }));

      return exportData;
    } catch (error) {
      console.error('Error exporting beneficiaries:', error);
      return [];
    }
  }

  static async importBeneficiaries(userId, importData) {
    try {
      const results = { success: 0, failed: 0, errors: [] };

      for (const data of importData) {
        try {
          await this.addBeneficiary(userId, data);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`${data.nickname}: ${error.message}`);
        }
      }

      return results;
    } catch (error) {
      console.error('Error importing beneficiaries:', error);
      throw error;
    }
  }
}

export default BeneficiaryManager;
