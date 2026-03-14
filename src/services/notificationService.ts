import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export const addNotification = async (
  userId: string,
  title: string,
  message: string,
  buttonText: string = '',
  buttonLink: string = '',
  targetRole: string = 'user'
) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      message,
      buttonText,
      buttonLink,
      targetRole,
      isRead: false,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error adding notification:", error);
  }
};
