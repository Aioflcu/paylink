class BulkPurchaseService {
  static async validateBulkData(data, type) {
    const errors = [];
    const validItems = [];

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const validation = this.validateSingleItem(item, type);

      if (validation.valid) {
        validItems.push({
          ...item,
          index: i + 1,
          validatedData: validation.data
        });
      } else {
        errors.push({
          row: i + 1,
          errors: validation.errors
        });
      }
    }

    return {
      validItems,
      errors,
      summary: {
        total: data.length,
        valid: validItems.length,
        invalid: errors.length
      }
    };
  }

  static validateSingleItem(item, type) {
    const errors = [];

    switch (type) {
      case 'airtime':
        if (!item.phoneNumber || !this.isValidPhoneNumber(item.phoneNumber)) {
          errors.push('Invalid phone number');
        }
        if (!item.amount || item.amount < 50 || item.amount > 50000) {
          errors.push('Amount must be between ₦50 and ₦50,000');
        }
        if (!item.network || !['MTN', 'Airtel', 'Glo', '9mobile'].includes(item.network)) {
          errors.push('Invalid network provider');
        }
        break;

      case 'data':
        if (!item.phoneNumber || !this.isValidPhoneNumber(item.phoneNumber)) {
          errors.push('Invalid phone number');
        }
        if (!item.plan || !item.amount) {
          errors.push('Plan and amount are required');
        }
        if (!item.network || !['MTN', 'Airtel', 'Glo', '9mobile'].includes(item.network)) {
          errors.push('Invalid network provider');
        }
        break;

      case 'electricity':
        if (!item.meterNumber || !/^\d{10,13}$/.test(item.meterNumber)) {
          errors.push('Invalid meter number');
        }
        if (!item.amount || item.amount < 500 || item.amount > 100000) {
          errors.push('Amount must be between ₦500 and ₦100,000');
        }
        if (!item.disco || !this.isValidDisco(item.disco)) {
          errors.push('Invalid electricity provider');
        }
        if (!['prepaid', 'postpaid'].includes(item.meterType?.toLowerCase())) {
          errors.push('Meter type must be prepaid or postpaid');
        }
        break;

      default:
        errors.push('Unsupported bulk purchase type');
    }

    return {
      valid: errors.length === 0,
      errors,
      data: errors.length === 0 ? this.normalizeItemData(item, type) : null
    };
  }

  static isValidPhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return /^(\+234|0)[789]\d{9}$/.test(cleaned);
  }

  static isValidDisco(disco) {
    const validDiscos = [
      'EKEDC', 'IKEDC', 'AEDC', 'IBEDC', 'PHED', 'JED', 'KAEDCO', 'EEDC',
      'BEDC', 'YEDC', 'UEDC', 'AEDL'
    ];
    return validDiscos.includes(disco?.toUpperCase());
  }

  static normalizeItemData(item, type) {
    const normalized = { ...item };

    // Normalize phone numbers
    if (normalized.phoneNumber) {
      normalized.phoneNumber = this.normalizePhoneNumber(normalized.phoneNumber);
    }

    // Normalize amounts
    if (normalized.amount) {
      normalized.amount = parseFloat(normalized.amount);
    }

    // Add type-specific normalizations
    switch (type) {
      case 'airtime':
      case 'data':
        normalized.network = normalized.network?.toUpperCase();
        break;
      case 'electricity':
        normalized.disco = normalized.disco?.toUpperCase();
        normalized.meterType = normalized.meterType?.toLowerCase();
        break;
    }

    return normalized;
  }

  static normalizePhoneNumber(phone) {
    let cleaned = phone.replace(/\D/g, '');

    // Add country code if missing
    if (cleaned.startsWith('0')) {
      cleaned = '234' + cleaned.slice(1);
    } else if (!cleaned.startsWith('234')) {
      cleaned = '234' + cleaned;
    }

    return '+' + cleaned;
  }

  static async processBulkPurchase(userId, items, type) {
    const results = {
      successful: [],
      failed: [],
      summary: {
        total: items.length,
        processed: 0,
        successful: 0,
        failed: 0,
        totalAmount: 0
      }
    };

    // Calculate total amount needed
    const totalAmount = items.reduce((sum, item) => sum + item.validatedData.amount, 0);

    // Check wallet balance
    const WalletService = require('./walletService');
    const hasBalance = await WalletService.checkBalance(userId, totalAmount);

    if (!hasBalance) {
      throw new Error(`Insufficient wallet balance. Required: ₦${totalAmount.toLocaleString()}`);
    }

    // Process items in batches to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await this.processBatch(userId, batch, type);

      results.successful.push(...batchResults.successful);
      results.failed.push(...batchResults.failed);
      results.summary.processed += batch.length;
      results.summary.successful += batchResults.successful.length;
      results.summary.failed += batchResults.failed.length;
    }

    results.summary.totalAmount = results.successful.reduce((sum, item) => sum + item.amount, 0);

    // Send completion notification
    await this.sendBulkPurchaseNotification(userId, results, type);

    return results;
  }

  static async processBatch(userId, batch, type) {
    const results = { successful: [], failed: [] };

    // Process items in parallel with concurrency control
    const promises = batch.map(async (item) => {
      try {
        const result = await this.processSingleBulkItem(userId, item, type);
        results.successful.push(result);
      } catch (error) {
        results.failed.push({
          ...item,
          error: error.message
        });
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  static async processSingleBulkItem(userId, item, type) {
    const { db } = await import('../firebase');
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
    const ApiService = require('./api');

    // Deduct from wallet
    const WalletService = require('./walletService');
    await WalletService.deductFromWallet(userId, item.validatedData.amount, `Bulk ${type} purchase`);

    // Make API call
    let apiResult;
    switch (type) {
      case 'airtime':
        apiResult = await ApiService.purchaseAirtime({
          phoneNumber: item.validatedData.phoneNumber,
          amount: item.validatedData.amount,
          network: item.validatedData.network
        });
        break;
      case 'data':
        apiResult = await ApiService.purchaseData({
          phoneNumber: item.validatedData.phoneNumber,
          plan: item.validatedData.plan,
          amount: item.validatedData.amount,
          network: item.validatedData.network
        });
        break;
      case 'electricity':
        apiResult = await ApiService.purchaseElectricity({
          meterNumber: item.validatedData.meterNumber,
          amount: item.validatedData.amount,
          disco: item.validatedData.disco,
          meterType: item.validatedData.meterType
        });
        break;
    }

    // Create transaction record in Firestore
    const transactionData = {
      userId,
      type: 'debit',
      category: type,
      amount: item.validatedData.amount,
      reference: apiResult.reference,
      status: 'success',
      description: `Bulk ${type} purchase - ${item.validatedData.phoneNumber || item.validatedData.meterNumber}`,
      metadata: {
        bulkPurchase: true,
        batchId: item.batchId,
        apiResponse: apiResult
      },
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'transactions'), transactionData);

    return {
      ...item.validatedData,
      reference: apiResult.reference,
      transactionId: docRef.id,
      status: 'success'
    };
  }

  static async sendBulkPurchaseNotification(userId, results, type) {
    const NotificationService = require('./notificationService');

    const message = `Bulk ${type} purchase completed. ${results.summary.successful}/${results.summary.total} successful. Total: ₦${results.summary.totalAmount.toLocaleString()}`;

    await NotificationService.sendNotification(userId, {
      type: 'bulk_purchase',
      title: 'Bulk Purchase Completed',
      message,
      data: {
        type,
        results: results.summary,
        action: 'view_history'
      }
    });
  }

  static parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));

    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const item = {};

      headers.forEach((header, index) => {
        item[header] = values[index] || '';
      });

      data.push(item);
    }

    return data;
  }

  static generateCSVTemplate(type) {
    const templates = {
      airtime: [
        ['phoneNumber', 'amount', 'network'],
        ['08012345678', '1000', 'MTN'],
        ['08123456789', '500', 'Airtel']
      ],
      data: [
        ['phoneNumber', 'plan', 'amount', 'network'],
        ['08012345678', '2GB', '2000', 'MTN'],
        ['08123456789', '1GB', '1000', 'Airtel']
      ],
      electricity: [
        ['meterNumber', 'amount', 'disco', 'meterType'],
        ['12345678901', '5000', 'EKEDC', 'prepaid'],
        ['12345678902', '3000', 'IKEDC', 'postpaid']
      ]
    };

    const template = templates[type];
    if (!template) return '';

    return template.map(row => row.join(',')).join('\n');
  }

  static async getBulkPurchaseHistory(userId, limit = 50) {
    try {
      const { db } = await import('../firebase');
      const { collection, query, where, orderBy, limit: firestoreLimit, getDocs } = await import('firebase/firestore');

      // Query transactions collection for bulk purchases
      const transactionsRef = collection(db, 'transactions');
      const q = query(
        transactionsRef,
        where('userId', '==', userId),
        where('metadata.bulkPurchase', '==', true),
        orderBy('createdAt', 'desc'),
        firestoreLimit(limit)
      );

      const querySnapshot = await getDocs(q);
      const bulkPurchases = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();
        bulkPurchases.push({
          id: doc.id,
          ...data
        });
      });

      // Group by batch if batchId exists
      const grouped = bulkPurchases.reduce((acc, purchase) => {
        const batchId = purchase.metadata?.batchId || purchase.id;

        if (!acc[batchId]) {
          acc[batchId] = {
            batchId,
            type: purchase.category,
            items: [],
            totalAmount: 0,
            createdAt: purchase.createdAt?.toDate?.() || new Date(purchase.createdAt),
            status: 'completed'
          };
        }

        acc[batchId].items.push({
          amount: purchase.amount,
          reference: purchase.reference,
          status: purchase.status
        });

        acc[batchId].totalAmount += purchase.amount;

        return acc;
      }, {});

      return Object.values(grouped);
    } catch (error) {
      console.error('Error getting bulk purchase history:', error);
      return [];
    }
  }

  static async estimateBulkCost(items, type) {
    let totalCost = 0;
    let totalFees = 0;

    for (const item of items) {
      if (item.validatedData) {
        const amount = item.validatedData.amount;
        totalCost += amount;

        // Calculate fees based on type
        const fee = this.calculateFee(type, amount);
        totalFees += fee;
      }
    }

    return {
      subtotal: totalCost,
      fees: totalFees,
      total: totalCost + totalFees,
      itemCount: items.length
    };
  }

  static calculateFee(type, amount) {
    const feeRates = {
      airtime: 0.01, // 1%
      data: 0.015,   // 1.5%
      electricity: 0.02 // 2%
    };

    const rate = feeRates[type] || 0.02;
    return Math.max(amount * rate, 10); // Minimum fee of ₦10
  }

  static async createBulkPurchaseBatch(userId, items, type) {
    try {
      const { db } = await import('../firebase');
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');

      const batchData = {
        userId,
        type,
        items: items.map(item => ({
          data: item.validatedData,
          status: 'pending'
        })),
        status: 'pending',
        totalItems: items.length,
        totalAmount: items.reduce((sum, item) => sum + item.validatedData.amount, 0),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'bulkPurchases'), batchData);

      return {
        id: docRef.id,
        ...batchData
      };
    } catch (error) {
      console.error('Error creating bulk purchase batch:', error);
      throw error;
    }
  }

  static async getBulkPurchaseBatches(userId, limit = 20) {
    try {
      const { db } = await import('../firebase');
      const { collection, query, where, orderBy, limit: firestoreLimit, getDocs } = await import('firebase/firestore');

      const batchesRef = collection(db, 'bulkPurchases');
      const q = query(
        batchesRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        firestoreLimit(limit)
      );

      const querySnapshot = await getDocs(q);
      const batches = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();
        batches.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
        });
      });

      return batches;
    } catch (error) {
      console.error('Error getting bulk purchase batches:', error);
      return [];
    }
  }

  static validateFileFormat(file) {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Invalid file type. Please upload a CSV or Excel file.' };
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'File too large. Maximum size is 5MB.' };
    }

    return { valid: true };
  }

  static async processExcelFile(file) {
    try {
      // Validate file format
      const validation = this.validateFileFormat(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const fileType = file.type;
      let data = [];

      if (fileType === 'text/csv') {
        // Handle CSV files
        const text = await file.text();
        data = this.parseCSV(text);
      } else if (fileType.includes('excel') || fileType.includes('spreadsheetml')) {
        // Handle Excel files using xlsx library
        const XLSX = await import('xlsx');
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        // Get the first worksheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1, // Use first row as headers
          defval: '' // Default value for empty cells
        });

        if (jsonData.length < 2) {
          throw new Error('Excel file must contain at least a header row and one data row');
        }

        // Convert to object format
        const headers = jsonData[0].map(h => h.toString().trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, ''));
        data = jsonData.slice(1).map(row => {
          const item = {};
          headers.forEach((header, index) => {
            item[header] = row[index] || '';
          });
          return item;
        });
      } else {
        throw new Error('Unsupported file format');
      }

      // Validate that we have data
      if (data.length === 0) {
        throw new Error('File appears to be empty or contains no valid data');
      }

      // Check for minimum required columns based on first row
      const headers = Object.keys(data[0]);
      const requiredColumns = ['phoneNumber', 'amount']; // Basic requirements

      const hasRequiredColumns = requiredColumns.some(col =>
        headers.some(header => header.toLowerCase().includes(col.toLowerCase()))
      );

      if (!hasRequiredColumns) {
        throw new Error('File must contain at least phone number and amount columns');
      }

      return data;
    } catch (error) {
      console.error('Error processing file:', error);
      throw new Error(`File processing failed: ${error.message}`);
    }
  }
}

export default BulkPurchaseService;
