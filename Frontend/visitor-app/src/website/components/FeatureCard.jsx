function FeatureCard({ icon, title, description, accent }) {
  return (
    <article className="website-feature-card" style={{ '--feature-accent': accent }}>
      <div className="website-feature-icon" aria-hidden="true">
        {icon}
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  )
}

export default FeatureCard
