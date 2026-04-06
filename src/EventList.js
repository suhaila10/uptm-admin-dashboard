// src/EventList.js
import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { Link } from 'react-router-dom';

function EventList({ user, userData }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming'); // upcoming, past, all
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEvents();
  }, [filter]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const now = Timestamp.now();
      let eventsQuery;
      
      if (filter === 'upcoming') {
        eventsQuery = query(
          collection(db, 'events'),
          where('date', '>=', now),
          orderBy('date', 'asc')
        );
      } else if (filter === 'past') {
        eventsQuery = query(
          collection(db, 'events'),
          where('date', '<', now),
          orderBy('date', 'desc')
        );
      } else {
        eventsQuery = query(
          collection(db, 'events'),
          orderBy('date', 'desc')
        );
      }

      const querySnapshot = await getDocs(eventsQuery);
      const eventsData = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        eventsData.push({
          id: doc.id,
          ...data,
          // Make sure date is a Timestamp
          date: data.date || Timestamp.now()
        });
      });

      console.log('Fetched events:', eventsData);
      setEvents(eventsData);
    } catch (error) {
      console.error('Error fetching events:', error);
      alert('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Date not set';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-MY', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Filter events by search term
  const filteredEvents = events.filter(event => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      event.title?.toLowerCase().includes(searchLower) ||
      event.description?.toLowerCase().includes(searchLower) ||
      event.venue?.toLowerCase().includes(searchLower) ||
      event.category?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', marginBottom: '10px' }}>🔄</div>
          <p>Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: 'auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Browse Events</h1>
        <p style={{ color: '#7f8c8d', margin: 0 }}>
          Discover and register for upcoming events at UPTM
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        gap: '15px', 
        marginBottom: '30px',
        padding: '20px',
        background: '#f8f9fa',
        borderRadius: '10px',
        alignItems: 'center'
      }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <input
            type="text"
            placeholder="Search events by title, description, venue..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 15px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '16px'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setFilter('upcoming')}
            style={{
              padding: '10px 20px',
              background: filter === 'upcoming' ? '#3498db' : 'white',
              color: filter === 'upcoming' ? 'white' : '#3498db',
              border: `1px solid #3498db`,
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: filter === 'upcoming' ? 'bold' : 'normal'
            }}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('past')}
            style={{
              padding: '10px 20px',
              background: filter === 'past' ? '#6c757d' : 'white',
              color: filter === 'past' ? 'white' : '#6c757d',
              border: `1px solid #6c757d`,
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: filter === 'past' ? 'bold' : 'normal'
            }}
          >
            Past Events
          </button>
          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '10px 20px',
              background: filter === 'all' ? '#2c3e50' : 'white',
              color: filter === 'all' ? 'white' : '#2c3e50',
              border: `1px solid #2c3e50`,
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: filter === 'all' ? 'bold' : 'normal'
            }}
          >
            All Events
          </button>
        </div>
      </div>

      {/* Create Event Button (for organizers/admins) */}
      {(userData?.role === 'organizer' || userData?.role === 'admin') && (
        <div style={{ marginBottom: '20px', textAlign: 'right' }}>
          <Link to="/create-event">
            <button style={{
              padding: '12px 24px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>➕</span> Create New Event
            </button>
          </Link>
        </div>
      )}

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '50px 20px',
          background: '#f8f9fa',
          borderRadius: '10px',
          border: '2px dashed #dee2e6'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.5 }}>📅</div>
          <h3 style={{ color: '#6c757d' }}>No Events Found</h3>
          <p style={{ color: '#6c757d', marginBottom: '20px' }}>
            {searchTerm 
              ? `No events match "${searchTerm}"`
              : filter === 'upcoming'
              ? "No upcoming events scheduled."
              : filter === 'past'
              ? "No past events found."
              : "No events in the system."}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                color: '#3498db',
                border: '1px solid #3498db',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '25px'
        }}>
          {filteredEvents.map(event => {
            const isPast = event.date?.toDate() < new Date();
            const isFull = event.attendeesCount >= event.capacity;
            
            return (
              <div 
                key={event.id} 
                style={{ 
                  background: 'white',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 15px rgba(0,0,0,0.08)',
                  border: '1px solid #e9ecef',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  ':hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 10px 20px rgba(0,0,0,0.12)'
                  }
                }}
              >
                {/* Event Header */}
                <div style={{ 
                  background: isPast ? '#6c757d' : '#3498db',
                  color: 'white',
                  padding: '15px 20px'
                }}>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '18px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {event.title}
                  </h3>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    marginTop: '8px',
                    fontSize: '13px',
                    opacity: 0.9
                  }}>
                    <span>{formatDate(event.date)}</span>
                    <span>{isPast ? 'Past Event' : 'Upcoming'}</span>
                  </div>
                </div>

                {/* Event Body */}
                <div style={{ padding: '20px' }}>
                  {/* Description */}
                  <p style={{ 
                    color: '#495057', 
                    lineHeight: '1.6',
                    marginBottom: '15px',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {event.description}
                  </p>

                  {/* Details */}
                  <div style={{ marginBottom: '15px' }}>
                    <p style={{ margin: '5px 0', color: '#7f8c8d', fontSize: '14px' }}>
                      <strong>📍 Venue:</strong> {event.venue}
                    </p>
                    <p style={{ margin: '5px 0', color: '#7f8c8d', fontSize: '14px' }}>
                      <strong>👥 Capacity:</strong> {event.attendeesCount || 0} / {event.capacity}
                    </p>
                    <p style={{ margin: '5px 0', color: '#7f8c8d', fontSize: '14px' }}>
                      <strong>🎯 Category:</strong> {event.category || 'General'}
                    </p>
                  </div>

                  {/* Tags */}
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '8px',
                    marginBottom: '20px'
                  }}>
                    {event.category && (
                      <span style={{
                        background: '#e8f4fc',
                        color: '#3498db',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}>
                        {event.category}
                      </span>
                    )}
                    {event.faculty && (
                      <span style={{
                        background: '#e7f6e7',
                        color: '#28a745',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}>
                        {event.faculty}
                      </span>
                    )}
                    {isFull && (
                      <span style={{
                        background: '#fde8e8',
                        color: '#dc3545',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}>
                        Full
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Link to={`/events/${event.id}`} style={{ textDecoration: 'none' }}>
                      <button style={{
                        padding: '8px 16px',
                        background: 'transparent',
                        color: '#3498db',
                        border: '1px solid #3498db',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}>
                        View Details
                      </button>
                    </Link>
                    
                    <div style={{ fontSize: '13px', color: '#7f8c8d' }}>
                      By: {event.organizerName || 'UPTM'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Info */}
      <div style={{ 
        marginTop: '40px',
        padding: '20px',
        background: '#f8f9fa',
        borderRadius: '10px',
        fontSize: '14px',
        color: '#6c757d',
        textAlign: 'center'
      }}>
        <p style={{ margin: 0 }}>
          Showing {filteredEvents.length} of {events.length} events • 
          Last updated: {new Date().toLocaleTimeString()}
        </p>
        <p style={{ margin: '10px 0 0 0', fontSize: '13px' }}>
          Need help? Contact the event organizer or system administrator.
        </p>
      </div>
    </div>
  );
}

export default EventList;