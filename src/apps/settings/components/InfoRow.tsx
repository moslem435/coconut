export function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between py-2 border-b last:border-0" style={{ borderColor: 'var(--os-border)' }}>
            <span style={{ color: 'var(--os-text-muted)' }}>{label}</span>
            <span style={{ color: 'var(--os-text-primary)' }}>{value}</span>
        </div>
    )
}
