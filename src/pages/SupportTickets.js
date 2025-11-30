import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import LoadingSpinner from '../components/LoadingSpinner';
import './SupportTickets.css';

const SupportTickets = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [activeTab, setActiveTab] = useState('create');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');

  const [formData, setFormData] = useState({
    subject: '',
    category: 'general',
    priority: 'medium',
    description: '',
    attachment: null
  });

  // Load tickets
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const loadTickets = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'supportTickets'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        setTickets(snapshot.docs.map(d => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate?.() || new Date()
        })));
      } catch (err) {
        console.error('Error loading tickets:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTickets();
  }, [currentUser, navigate]);

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Create ticket
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.subject.trim() || !formData.description.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setCreating(true);

      const ticketData = {
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email,
        subject: formData.subject,
        category: formData.category,
        priority: formData.priority,
        description: formData.description,
        status: 'open',
        messages: [{
          sender: 'user',
          text: formData.description,
          timestamp: serverTimestamp()
        }],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'supportTickets'), ticketData);

      setTickets([{
        id: docRef.id,
        ...ticketData,
        createdAt: new Date()
      }, ...tickets]);

      setSuccess('Ticket created successfully. Ref: #' + docRef.id.substring(0, 8));
      setFormData({
        subject: '',
        category: 'general',
        priority: 'medium',
        description: '',
        attachment: null
      });

      setTimeout(() => setActiveTab('open'), 2000);
    } catch (err) {
      console.error('Error creating ticket:', err);
      setError('Failed to create ticket');
    } finally {
      setCreating(false);
    }
  };

  // Reply to ticket
  const handleReply = async (ticketId) => {
    if (!replyText.trim()) {
      setError('Please enter a message');
      return;
    }

    try {
      const ticketRef = doc(db, 'supportTickets', ticketId);
      const ticket = tickets.find(t => t.id === ticketId);

      const newMessages = [
        ...ticket.messages,
        {
          sender: 'user',
          text: replyText,
          timestamp: serverTimestamp()
        }
      ];

      await updateDoc(ticketRef, {
        messages: newMessages,
        updatedAt: serverTimestamp()
      });

      setTickets(tickets.map(t =>
        t.id === ticketId ? { ...t, messages: newMessages } : t
      ));

      setReplyText('');
      setSuccess('Reply sent');
    } catch (err) {
      console.error('Error sending reply:', err);
      setError('Failed to send reply');
    }
  };

  // Close ticket
  const handleCloseTicket = async (ticketId) => {
    try {
      await updateDoc(doc(db, 'supportTickets', ticketId), {
        status: 'closed',
        updatedAt: serverTimestamp()
      });

      setTickets(tickets.map(t =>
        t.id === ticketId ? { ...t, status: 'closed' } : t
      ));
      setSelectedTicket(null);
      setSuccess('Ticket closed');
    } catch (err) {
      console.error('Error closing ticket:', err);
      setError('Failed to close ticket');
    }
  };

  // Get category icon
  const getCategoryIcon = (category) => {
    const icons = {
      airtime: '📱',
      data: '🌐',
      electricity: '⚡',
      payment: '💳',
      account: '👤',
      general: '❓'
    };
    return icons[category] || '❓';
  };

  const openCount = tickets.filter(t => t.status === 'open').length;
  const closedCount = tickets.filter(t => t.status === 'closed').length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="support-tickets">
      {/* Header */}
      <div className="st-header">
        <h1>🎟️ Support Tickets</h1>
        <p className="st-subtitle">Get help and track your support requests</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Tabs */}
      <div className="st-tabs">
        <button
          className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          ➕ Create Ticket
        </button>
        <button
          className={`tab-btn ${activeTab === 'open' ? 'active' : ''}`}
          onClick={() => setActiveTab('open')}
        >
          🔴 Open ({openCount})
        </button>
        <button
          className={`tab-btn ${activeTab === 'closed' ? 'active' : ''}`}
          onClick={() => setActiveTab('closed')}
        >
          ✓ Closed ({closedCount})
        </button>
      </div>

      {/* Create Tab */}
      {activeTab === 'create' && (
        <div className="st-form-section">
          <form onSubmit={handleCreateTicket} className="st-form">
            <div className="form-group">
              <label>Subject *</label>
              <input
                type="text"
                name="subject"
                placeholder="Brief description of your issue"
                value={formData.subject}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Category *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                >
                  <option value="airtime">📱 Airtime</option>
                  <option value="data">🌐 Data</option>
                  <option value="electricity">⚡ Electricity</option>
                  <option value="payment">💳 Payment Issue</option>
                  <option value="account">👤 Account</option>
                  <option value="general">❓ General</option>
                </select>
              </div>

              <div className="form-group">
                <label>Priority *</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea
                name="description"
                placeholder="Describe your issue in detail..."
                value={formData.description}
                onChange={handleInputChange}
                rows="6"
                required
              ></textarea>
            </div>

            <button type="submit" className="btn-submit" disabled={creating}>
              {creating ? '⏳ Creating...' : '📧 Submit Ticket'}
            </button>
          </form>
        </div>
      )}

      {/* Open Tickets Tab */}
      {activeTab === 'open' && (
        <div className="st-list-section">
          {tickets.filter(t => t.status === 'open').length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>No open tickets</h3>
              <p>All your issues have been resolved!</p>
            </div>
          ) : (
            <div className="tickets-list">
              {tickets.filter(t => t.status === 'open').map(ticket => (
                <div key={ticket.id} className="ticket-card">
                  <div className="ticket-header">
                    <h3>{getCategoryIcon(ticket.category)} {ticket.subject}</h3>
                    <span className={`priority ${ticket.priority}`}>{ticket.priority}</span>
                  </div>

                  <div className="ticket-meta">
                    <span className="meta-item">
                      Ticket: <strong>#{ticket.id.substring(0, 8)}</strong>
                    </span>
                    <span className="meta-item">
                      Created: {new Date(ticket.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <p className="ticket-description">{ticket.description}</p>

                  <button
                    className="btn-view"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    💬 View & Reply
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Closed Tickets Tab */}
      {activeTab === 'closed' && (
        <div className="st-list-section">
          {tickets.filter(t => t.status === 'closed').length === 0 ? (
            <div className="empty-state">
              <p>No closed tickets yet</p>
            </div>
          ) : (
            <div className="tickets-list">
              {tickets.filter(t => t.status === 'closed').map(ticket => (
                <div key={ticket.id} className="ticket-card closed">
                  <div className="ticket-header">
                    <h3>✓ {ticket.subject}</h3>
                    <span className="status-closed">Closed</span>
                  </div>

                  <div className="ticket-meta">
                    <span>#{ticket.id.substring(0, 8)}</span>
                    <span>{new Date(ticket.createdAt).toLocaleString()}</span>
                  </div>

                  <button
                    className="btn-view"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    📖 View Details
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="ticket-modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="ticket-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedTicket.subject}</h2>
              <button className="btn-close" onClick={() => setSelectedTicket(null)}>✕</button>
            </div>

            <div className="modal-content">
              <div className="ticket-info">
                <span>#{selectedTicket.id.substring(0, 8)}</span>
                <span>{selectedTicket.category}</span>
                <span className={`status ${selectedTicket.status}`}>{selectedTicket.status}</span>
              </div>

              <div className="messages-list">
                {selectedTicket.messages?.map((msg, idx) => (
                  <div key={idx} className={`message ${msg.sender}`}>
                    <div className="msg-sender">
                      {msg.sender === 'user' ? 'You' : 'Support Team'}
                    </div>
                    <div className="msg-text">{msg.text}</div>
                    <div className="msg-time">
                      {msg.timestamp?.toDate?.()?.toLocaleString?.() || 'Just now'}
                    </div>
                  </div>
                ))}
              </div>

              {selectedTicket.status === 'open' && (
                <div className="reply-section">
                  <textarea
                    placeholder="Type your reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows="3"
                  ></textarea>
                  <div className="reply-actions">
                    <button
                      className="btn-send"
                      onClick={() => handleReply(selectedTicket.id)}
                    >
                      📤 Send Reply
                    </button>
                    <button
                      className="btn-close-ticket"
                      onClick={() => handleCloseTicket(selectedTicket.id)}
                    >
                      ✓ Close Ticket
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportTickets;
