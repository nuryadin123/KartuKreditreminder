
"use client";
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * A real-time hook to listen to a Firestore collection.
 * @param collectionName The name of the Firestore collection.
 * @returns An object containing the collection data, loading state, and any errors.
 * Note: The returned documents will have their Firestore ID mapped to the 'id' property.
 */
export function useFirestoreCollection<T>(collectionName: string) {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!collectionName) {
            setLoading(false);
            return;
        }
        
        const collectionRef = collection(db, collectionName);
        const q = query(collectionRef);
        
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
    }, [collectionName]);

    return { data, loading, error };
}
