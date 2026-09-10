import { Loader2 } from 'lucide-react'

export default function Spinner({ size = 24, className = '' }) {
    return <Loader2 size={size} className={`animate-spin text-muted ${className}`} />
}

export function LoadingScreen() {
    return (
        <div className="flex items-center justify-center py-20">
            <Spinner size={28} />
        </div>
    )
}