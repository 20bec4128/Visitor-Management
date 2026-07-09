function SectionTitle({ eyebrow, title, description, align = 'left' }) {
  return (
    <div className={`website-section-title website-section-title-${align}`}>
      {eyebrow ? <p className="website-eyebrow">{eyebrow}</p> : null}
      <h2>{title}</h2>
      {description ? <p className="website-section-copy">{description}</p> : null}
    </div>
  )
}

export default SectionTitle
