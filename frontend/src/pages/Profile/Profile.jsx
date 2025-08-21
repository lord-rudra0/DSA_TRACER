import React from 'react';
import { useParams } from 'react-router-dom';

export default function Profile() {
  const { username } = useParams();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <p className="text-gray-600 dark:text-gray-300 mt-2">{username ? `Viewing @${username}` : 'Your profile'}</p>
    </div>
  );
}
