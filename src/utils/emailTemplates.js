// src/utils/emailTemplates.js
export const getCancellationEmailTemplate = (event, user, reason = '') => ({
  subject: `Event Cancelled: ${event.title}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #f8d7da; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
        <h2 style="color: #721c24; margin: 0;">⚠️ Event Cancelled</h2>
      </div>
      
      <h3>${event.title}</h3>
      <p><strong>Event Code:</strong> ${event.eventCode}</p>
      <p><strong>Original Date:</strong> ${formatDate(event.date)}</p>
      <p><strong>Venue:</strong> ${event.venue}</p>
      
      ${reason ? `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <strong>Cancellation Reason:</strong>
          <p>${reason}</p>
        </div>
      ` : ''}
      
      <p>We apologize for any inconvenience caused. You may want to:</p>
      <ul>
        <li>Check other upcoming events on our platform</li>
        <li>Contact the organizer for any questions</li>
        <li>Look for similar events in the future</li>
      </ul>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
        <p style="color: #6c757d; font-size: 14px;">
          UPTM Event Management System<br>
          If you have any questions, contact: ${event.organizerEmail}
        </p>
      </div>
    </div>
  `
});