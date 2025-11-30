import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import NotificationService from './notificationService';

class SupportService {
  static async createTicket(userId, ticketData) {
    try {
      const ticketsRef = collection(db, 'support_tickets');

      const newTicket = {
        userId,
        subject: ticketData.subject,
        description: ticketData.description,
        priority: ticketData.priority || 'medium',
        attachments: ticketData.attachments || [],
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        messages: []
      };

      const docRef = await addDoc(ticketsRef, newTicket);

      // Send notification to user
      await NotificationService.sendNotification(userId, {
        type: 'support',
        title: 'Support Ticket Created',
        message: `Your ticket #${docRef.id.substring(0, 8)} has been created. We'll respond soon.`,
        data: { ticketId: docRef.id, action: 'view_ticket' }
      });

      return { id: docRef.id, ...newTicket };
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  }

  static async getUserTickets(userId, status = null) {
    try {
      const ticketsRef = collection(db, 'support_tickets');
      let q;

      if (status) {
        q = query(
          ticketsRef,
          where('userId', '==', userId),
          where('status', '==', status),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(
          ticketsRef,
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      const tickets = [];
      querySnapshot.forEach(doc => {
        tickets.push({ id: doc.id, ...doc.data() });
      });

      return tickets;
    } catch (error) {
      console.error('Error getting user tickets:', error);
      return [];
    }
  }

  static async addMessageToTicket(ticketId, userId, message, senderType = 'user', attachments = []) {
    try {
      const ticketRef = doc(db, 'support_tickets', ticketId);
      const ticketSnap = await getDocs(query(
        collection(db, 'support_tickets'),
        where('__name__', '==', ticketId)
      ));

      if (ticketSnap.empty) {
        throw new Error('Ticket not found');
      }

      const ticketDoc = ticketSnap.docs[0].data();

      // Check if user owns the ticket (for user messages)
      if (senderType === 'user' && ticketDoc.userId !== userId) {
        throw new Error('Unauthorized access to ticket');
      }

      const newMessage = {
        sender: userId,
        senderType,
        message,
        attachments,
        timestamp: serverTimestamp()
      };

      const currentMessages = ticketDoc.messages || [];
      currentMessages.push(newMessage);

      // Update ticket status if admin responds
      const updateData = {
        messages: currentMessages,
        updatedAt: serverTimestamp()
      };

      if (senderType === 'admin' && ticketDoc.status === 'open') {
        updateData.status = 'in-progress';
      }

      await updateDoc(ticketRef, updateData);

      // Send notification
      const recipientId = senderType === 'user' ? ticketDoc.userId : userId;

      await NotificationService.sendNotification(recipientId, {
        type: 'support',
        title: 'New Message in Support Ticket',
        message: `New message in ticket #${ticketId.substring(0, 8)}`,
        data: { ticketId, action: 'view_ticket' }
      });

      return { id: ticketId, ...updateData };
    } catch (error) {
      console.error('Error adding message to ticket:', error);
      throw error;
    }
  }

  static async updateTicketStatus(ticketId, status, adminId) {
    try {
      const ticketRef = doc(db, 'support_tickets', ticketId);

      const updateData = {
        status,
        updatedAt: serverTimestamp()
      };

      await updateDoc(ticketRef, updateData);
      return { id: ticketId, ...updateData };
    } catch (error) {
      console.error('Error updating ticket status:', error);
      throw error;
    }
  }

  static async getAllTickets(filters = {}) {
    try {
      const ticketsRef = collection(db, 'support_tickets');
      let q = query(ticketsRef, orderBy('createdAt', 'desc'));

      if (filters.status) {
        q = query(
          ticketsRef,
          where('status', '==', filters.status),
          orderBy('createdAt', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      const tickets = [];
      querySnapshot.forEach(doc => {
        tickets.push({ id: doc.id, ...doc.data() });
      });

      return tickets;
    } catch (error) {
      console.error('Error getting all tickets:', error);
      return [];
    }
  }

  static async assignTicket(ticketId, adminId) {
    try {
      const ticketRef = doc(db, 'support_tickets', ticketId);
      await updateDoc(ticketRef, {
        assignedTo: adminId,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error assigning ticket:', error);
      throw error;
    }
  }

  static async getTicketStats() {
    try {
      // Simplified stats without aggregation
      return {
        open: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0
      };
    } catch (error) {
      console.error('Error getting ticket stats:', error);
      return {};
    }
  }

  static async searchTickets(searchTerm, filters = {}) {
    try {
      const ticketsRef = collection(db, 'support_tickets');
      const allTickets = await getDocs(ticketsRef);

      const results = [];
      const searchLower = searchTerm.toLowerCase();

      allTickets.forEach(doc => {
        const data = doc.data();
        if (
          data.subject?.toLowerCase().includes(searchLower) ||
          data.description?.toLowerCase().includes(searchLower)
        ) {
          results.push({ id: doc.id, ...data });
        }
      });

      return results;
    } catch (error) {
      console.error('Error searching tickets:', error);
      return [];
    }
  }

  static async notifySupportTeam(ticket) {
    try {
      // Frontend notification only
      console.log('Support team notification for ticket:', ticket);
      return true;
    } catch (error) {
      console.error('Error notifying support team:', error);
      return false;
    }
  }

  static async uploadAttachment(file, ticketId, userId) {
    try {
      // Simplified attachment handling
      return {
        fileId: Date.now(),
        filename: file.name,
        size: file.size,
        uploadedAt: new Date()
      };
    } catch (error) {
      console.error('Error uploading attachment:', error);
      throw error;
    }
  }

  static async closeTicket(ticketId, adminId) {
    try {
      const ticketRef = doc(db, 'support_tickets', ticketId);
      await updateDoc(ticketRef, {
        status: 'closed',
        closedAt: serverTimestamp(),
        closedBy: adminId
      });
      return true;
    } catch (error) {
      console.error('Error closing ticket:', error);
      throw error;
    }
  }

  static async rateTicketResolution(ticketId, rating, feedback) {
    try {
      const ticketRef = doc(db, 'support_tickets', ticketId);
      await updateDoc(ticketRef, {
        rating,
        feedback,
        ratedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error rating ticket:', error);
      throw error;
    }
  }

  static async getSupportCategories() {
    return [
      { id: 'account', name: 'Account Issues', description: 'Login, registration, profile problems' },
      { id: 'payment', name: 'Payment Issues', description: 'Transaction failures, refunds, charges' },
      { id: 'services', name: 'Service Issues', description: 'Airtime, data, electricity, cable problems' },
      { id: 'technical', name: 'Technical Issues', description: 'App crashes, bugs, performance' },
      { id: 'billing', name: 'Billing Questions', description: 'Invoices, statements, disputes' },
      { id: 'feature', name: 'Feature Requests', description: 'New features, improvements' },
      { id: 'other', name: 'Other', description: 'General inquiries' }
    ];
  }

  static async autoAssignTicket(ticket) {
    try {
      // Simple auto-assignment logic
      const admins = await this.getAvailableAdmins();
      if (admins.length === 0) return null;

      // Assign to admin with least active tickets
      const adminWorkloads = await Promise.all(
        admins.map(async (admin) => ({
          adminId: admin._id,
          workload: await this.getAdminWorkload(admin._id)
        }))
      );

      const leastBusyAdmin = adminWorkloads.reduce((min, current) =>
        current.workload < min.workload ? current : min
      );

      return leastBusyAdmin.adminId;
    } catch (error) {
      console.error('Error auto-assigning ticket:', error);
      return null;
    }
  }

  static async getAvailableAdmins() {
    // Return list of admin users
    // This would query admin users from database
    return [];
  }

  static async getAdminWorkload(adminId) {
    try {
      const activeTickets = await this.getAllTickets({ status: 'open' });
      const adminTickets = activeTickets.filter(ticket => ticket.assignedTo === adminId);
      return adminTickets.length;
    } catch (error) {
      console.error('Error getting admin workload:', error);
      return 0;
    }
  }
}

export default SupportService;
