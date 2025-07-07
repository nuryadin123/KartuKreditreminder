'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function DeprecatedPaymentPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/cards');
    }, [router]);

    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="ml-4">Mengalihkan...</p>
        </div>
    );
}
