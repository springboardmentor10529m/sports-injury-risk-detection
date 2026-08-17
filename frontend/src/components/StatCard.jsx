function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
    danger = false
}) {
    return (
        <div className={`stat-card ${danger ? "danger" : ""}`}>
            <div className="stat-card-top">
                <span>{title}</span>

                {Icon && (
                    <div className="stat-icon">
                        <Icon size={20} />
                    </div>
                )}
            </div>

            <strong>{value}</strong>

            {subtitle && <small>{subtitle}</small>}
        </div>
    );
}

export default StatCard;