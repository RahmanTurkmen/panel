export default function Modal({ open, title, onClose, children, actions, size = 'default' }) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className={`modal-card ${size === 'wide' ? 'wide' : ''}`}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button type="button" className="btn small" onClick={onClose}>Kapat</button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-actions">{actions}</div>
      </div>
    </div>
  );
}
