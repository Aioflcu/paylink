import jsPDF from 'jspdf';
import QRCode from 'qrcode.react';
import html2canvas from 'html2canvas';

/**
 * Receipt Service - Handles receipt generation, storage, and sharing
 * Features: PDF generation, QR codes, cloud backup, email/WhatsApp sharing
 */

export const receiptService = {
  /**
   * Generate a receipt object with all transaction details
   */
  createReceipt: (transactionData) => {
    return {
      id: generateReceiptID(),
      transactionReference: transactionData.reference || generateTransactionReference(),
      type: transactionData.type, // 'airtime', 'electricity', 'cable', 'internet', 'education', 'tax', 'data'
      provider: transactionData.provider,
      amount: transactionData.amount,
      userName: transactionData.userName,
      userPhone: transactionData.userPhone,
      timestamp: new Date(),
      status: transactionData.status || 'completed', // completed, pending, failed
      paymentMethod: transactionData.paymentMethod || 'Wallet',
      description: transactionData.description,
      details: transactionData.details || {}, // Additional service-specific details
      qrCodeData: null, // Will be generated
    };
  },

  /**
   * Generate PDF receipt
   */
  generatePDF: (receipt) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Set fonts
      const titleFont = 20;
      const headingFont = 14;
      const normalFont = 12;
      const smallFont = 10;

      let yPosition = 20;

      // Header
      doc.setFontSize(titleFont);
      doc.setTextColor(41, 128, 185); // Blue
      doc.text('PAYLINK', 105, yPosition, { align: 'center' });

      yPosition += 15;
      doc.setFontSize(smallFont);
      doc.setTextColor(100, 100, 100);
      doc.text('Digital Payment Solutions', 105, yPosition, { align: 'center' });

      // Receipt title
      yPosition += 15;
      doc.setFontSize(headingFont);
      doc.setTextColor(0, 0, 0);
      doc.text('TRANSACTION RECEIPT', 105, yPosition, { align: 'center' });

      // Divider
      yPosition += 8;
      doc.setDrawColor(200, 200, 200);
      doc.line(15, yPosition, 195, yPosition);

      // Receipt details section
      yPosition += 12;
      doc.setFontSize(normalFont);

      const receiptFields = [
        { label: 'Receipt No.', value: receipt.id },
        { label: 'Date & Time', value: formatDateTime(receipt.timestamp) },
        { label: 'Status', value: receipt.status.toUpperCase() },
        { label: 'Transaction Ref', value: receipt.transactionReference },
      ];

      receiptFields.forEach((field) => {
        doc.setTextColor(100, 100, 100);
        doc.text(`${field.label}:`, 20, yPosition);
        doc.setTextColor(0, 0, 0);
        doc.text(field.value, 130, yPosition);
        yPosition += 7;
      });

      // Transaction details section
      yPosition += 5;
      doc.setFontSize(headingFont);
      doc.setTextColor(41, 128, 185);
      doc.text('TRANSACTION DETAILS', 20, yPosition);

      yPosition += 10;
      doc.setFontSize(normalFont);
      doc.setTextColor(0, 0, 0);

      const serviceTypeMap = {
        airtime: 'Airtime Top-up',
        data: 'Data Bundle',
        electricity: 'Electricity Bill',
        cable: 'Cable TV Subscription',
        internet: 'Internet Service',
        education: 'Education Payment',
        tax: 'Tax Payment',
      };

      const transactionDetails = [
        { label: 'Service Type', value: serviceTypeMap[receipt.type] || receipt.type },
        { label: 'Provider', value: receipt.provider },
        { label: 'Amount', value: `₦${receipt.amount.toLocaleString()}` },
        { label: 'Payment Method', value: receipt.paymentMethod },
      ];

      transactionDetails.forEach((field) => {
        doc.setTextColor(100, 100, 100);
        doc.text(`${field.label}:`, 20, yPosition);
        doc.setTextColor(0, 0, 0);
        doc.text(field.value, 130, yPosition);
        yPosition += 7;
      });

      // Additional details if present
      if (Object.keys(receipt.details).length > 0) {
        yPosition += 5;
        doc.setFontSize(headingFont);
        doc.setTextColor(41, 128, 185);
        doc.text('SERVICE DETAILS', 20, yPosition);

        yPosition += 10;
        doc.setFontSize(normalFont);

        Object.entries(receipt.details).forEach(([key, value]) => {
          const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
          const capitalizedKey =
            formattedKey.charAt(0).toUpperCase() + formattedKey.slice(1);

          doc.setTextColor(100, 100, 100);
          doc.text(`${capitalizedKey}:`, 20, yPosition);
          doc.setTextColor(0, 0, 0);
          doc.text(String(value), 130, yPosition);
          yPosition += 7;
        });
      }

      // Customer info section
      yPosition += 8;
      doc.setFontSize(headingFont);
      doc.setTextColor(41, 128, 185);
      doc.text('CUSTOMER INFORMATION', 20, yPosition);

      yPosition += 10;
      doc.setFontSize(normalFont);
      doc.setTextColor(100, 100, 100);
      doc.text('Name:', 20, yPosition);
      doc.setTextColor(0, 0, 0);
      doc.text(receipt.userName || 'N/A', 130, yPosition);

      yPosition += 7;
      doc.setTextColor(100, 100, 100);
      doc.text('Phone:', 20, yPosition);
      doc.setTextColor(0, 0, 0);
      doc.text(receipt.userPhone || 'N/A', 130, yPosition);

      // QR Code section
      yPosition += 15;
      doc.setFontSize(smallFont);
      doc.setTextColor(100, 100, 100);
      doc.text('Scan to verify transaction:', 105, yPosition, { align: 'center' });

      yPosition += 8;
      // QR Code would be added here - for now, we'll add a placeholder
      doc.setFillColor(240, 240, 240);
      doc.rect(80, yPosition, 50, 50, 'F');
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(10);
      doc.text('QR Code', 105, yPosition + 25, { align: 'center' });

      // Footer
      yPosition = doc.internal.pageSize.height - 20;
      doc.setDrawColor(200, 200, 200);
      doc.line(15, yPosition, 195, yPosition);

      yPosition += 5;
      doc.setFontSize(smallFont);
      doc.setTextColor(100, 100, 100);
      doc.text('Thank you for using PayLink!', 105, yPosition, { align: 'center' });

      yPosition += 6;
      doc.text('For support, contact: support@paylink.com', 105, yPosition, {
        align: 'center',
      });

      return doc;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  },

  /**
   * Download receipt as PDF
   */
  downloadPDF: (receipt) => {
    try {
      const doc = receiptService.generatePDF(receipt);
      const fileName = `Receipt-${receipt.id}-${formatDateForFile(receipt.timestamp)}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  },

  /**
   * Share receipt via email
   */
  shareViaEmail: async (receipt, email) => {
    try {
      const doc = receiptService.generatePDF(receipt);
      const pdfData = doc.output('blob');

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('email', email);
      formData.append('receipt', pdfData, `Receipt-${receipt.id}.pdf`);
      formData.append('subject', `Your PayLink Receipt - ${receipt.provider}`);
      formData.append('body', generateEmailBody(receipt));

      // This would call your backend email service
      const response = await fetch('/api/send-receipt-email', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      return { success: true, message: 'Receipt sent via email' };
    } catch (error) {
      console.error('Error sharing via email:', error);
      throw error;
    }
  },

  /**
   * Share receipt via WhatsApp
   */
  shareViaWhatsApp: (receipt) => {
    try {
      const message = generateWhatsAppMessage(receipt);
      const encodedMessage = encodeURIComponent(message);
      const phone = receipt.userPhone.replace(/[^0-9]/g, '');

      // Open WhatsApp with pre-filled message
      const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');

      return { success: true, message: 'Opening WhatsApp...' };
    } catch (error) {
      console.error('Error sharing via WhatsApp:', error);
      throw error;
    }
  },

  /**
   * Save receipt to Firebase Storage (cloud backup)
   */
  saveToCloud: async (receipt, userId) => {
    try {
      const db = getFirebaseInstance(); // Get Firestore instance from firebase.js
      const fileName = `receipts/${userId}/${receipt.id}.json`;

      // Save receipt metadata to Firestore
      await db.collection('users').doc(userId).collection('receipts').doc(receipt.id).set({
        ...receipt,
        timestamp: new Date(receipt.timestamp),
        createdAt: new Date(),
      });

      return { success: true, receiptId: receipt.id };
    } catch (error) {
      console.error('Error saving to cloud:', error);
      throw error;
    }
  },

  /**
   * Get receipt from cloud
   */
  getReceiptFromCloud: async (userId, receiptId) => {
    try {
      const db = getFirebaseInstance();
      const doc = await db
        .collection('users')
        .doc(userId)
        .collection('receipts')
        .doc(receiptId)
        .get();

      if (!doc.exists) {
        throw new Error('Receipt not found');
      }

      return doc.data();
    } catch (error) {
      console.error('Error fetching receipt:', error);
      throw error;
    }
  },

  /**
   * Get all receipts for a user
   */
  getUserReceipts: async (userId, limit = 50) => {
    try {
      const db = getFirebaseInstance();
      const snapshot = await db
        .collection('users')
        .doc(userId)
        .collection('receipts')
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      const receipts = [];
      snapshot.forEach((doc) => {
        receipts.push({ id: doc.id, ...doc.data() });
      });

      return receipts;
    } catch (error) {
      console.error('Error fetching receipts:', error);
      throw error;
    }
  },

  /**
   * Delete receipt from cloud
   */
  deleteReceipt: async (userId, receiptId) => {
    try {
      const db = getFirebaseInstance();
      await db
        .collection('users')
        .doc(userId)
        .collection('receipts')
        .doc(receiptId)
        .delete();

      return { success: true, message: 'Receipt deleted' };
    } catch (error) {
      console.error('Error deleting receipt:', error);
      throw error;
    }
  },

  /**
   * Search receipts by type, provider, or date range
   */
  searchReceipts: async (userId, criteria) => {
    try {
      const db = getFirebaseInstance();
      let query = db.collection('users').doc(userId).collection('receipts');

      if (criteria.type) {
        query = query.where('type', '==', criteria.type);
      }

      if (criteria.provider) {
        query = query.where('provider', '==', criteria.provider);
      }

      const snapshot = await query.orderBy('timestamp', 'desc').get();

      const results = [];
      snapshot.forEach((doc) => {
        const data = doc.data();

        // Filter by date range if provided
        if (criteria.startDate || criteria.endDate) {
          const docDate = data.timestamp.toDate();
          if (
            (!criteria.startDate || docDate >= criteria.startDate) &&
            (!criteria.endDate || docDate <= criteria.endDate)
          ) {
            results.push({ id: doc.id, ...data });
          }
        } else {
          results.push({ id: doc.id, ...data });
        }
      });

      return results;
    } catch (error) {
      console.error('Error searching receipts:', error);
      throw error;
    }
  },

  /**
   * Export receipts to CSV
   */
  exportToCSV: (receipts) => {
    try {
      const headers = [
        'Receipt ID',
        'Date',
        'Type',
        'Provider',
        'Amount',
        'Status',
        'Reference',
      ];
      const rows = receipts.map((r) => [
        r.id,
        formatDateTime(r.timestamp),
        r.type,
        r.provider,
        `₦${r.amount.toLocaleString()}`,
        r.status,
        r.transactionReference,
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipts-${formatDateForFile(new Date())}.csv`;
      a.click();

      return { success: true, message: 'Receipts exported to CSV' };
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      throw error;
    }
  },
};

/**
 * Helper functions
 */

function generateReceiptID() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `RCP-${timestamp}-${random}`;
}

function generateTransactionReference() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function formatDateTime(date) {
  const d = new Date(date);
  const dateStr = d.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = d.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return `${dateStr} ${timeStr}`;
}

function formatDateForFile(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}-${hours}${minutes}`;
}

function generateEmailBody(receipt) {
  return `
Dear ${receipt.userName},

Thank you for using PayLink! Your transaction has been completed successfully.

Transaction Details:
- Receipt Number: ${receipt.id}
- Date: ${formatDateTime(receipt.timestamp)}
- Service: ${receipt.provider}
- Amount: ₦${receipt.amount.toLocaleString()}
- Status: ${receipt.status.toUpperCase()}
- Reference: ${receipt.transactionReference}

Please keep this receipt for your records.

Best regards,
PayLink Team
support@paylink.com
  `.trim();
}

function generateWhatsAppMessage(receipt) {
  return `*PayLink Receipt* 📄

Hello ${receipt.userName},

Here's your transaction receipt:

Receipt #: ${receipt.id}
Date: ${formatDateTime(receipt.timestamp)}
Service: ${receipt.provider}
Amount: ₦${receipt.amount.toLocaleString()}
Status: ${receipt.status.toUpperCase()}
Reference: ${receipt.transactionReference}

Thank you for using PayLink! 🙏
  `.trim();
}

export default receiptService;
