
"use client";
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * A real-time hook to listen to a Firestore collection, filtered by user ID.
 * @param collectionName The name of the Firestore collection.
 * @param userId The ID of the currently logged-in user.
 * @returns An object containing the collection data, loading state, and any errors.
 */
export function useFirestoreCollection<T>(collectionName: string, userId: string | null | undefined) {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!collectionName || !userId) {
            setData([]);
            setLoading(false);
            return;
        }
        
        const collectionRef = collection(db, collectionName);
        const q = query(collectionRef, where("userId", "==", userId));
        
        const unsubscribe = onSnapshot(q, 
            (querySnapshot) => {
                const items = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as T[];
                setData(items);
                setLoading(false);
            },
            (err) => {
                console.error(`Error fetching collection ${collectionName}:`, err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [collectionName, userId]);

    return { data, loading, error };
}
