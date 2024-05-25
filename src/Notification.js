// Notification.js
import React from 'react';
import './App.css';

const Notification = ({ message }) => {
  if (!message) return null;

  return (
    <div className="notification">
      {message}
    </div>
  );
};

export default Notification;
