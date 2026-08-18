function StatCard({
  title,
  value,
  unit,
  description,
  status = "normal",
  icon
}) {

  return (
    <div className="stat-card">

      <div className="stat-card-header">

        <span>
          {title}
        </span>

        <div className={`stat-icon ${status}`}>
          {icon}
        </div>

      </div>


      <div className="stat-value">

        {value}

        {unit && (
          <small>
            {unit}
          </small>
        )}

      </div>


      <div className="stat-description">
        {description}
      </div>

    </div>
  );
}

export default StatCard;