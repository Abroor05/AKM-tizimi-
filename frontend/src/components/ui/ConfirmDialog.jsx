import { FaTrashCan, FaTriangleExclamation } from 'react-icons/fa6';
import Modal from './Modal.jsx';
import Button from './Button.jsx';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Tasdiqlang',
  message = 'Bu amalni bajarishni xohlaysizmi?',
  confirmText = 'Tasdiqlash',
  cancelText = "Bekor qilish",
  variant = 'danger',
  icon: Icon = FaTriangleExclamation,
}) {
  const iconColors = {
    danger: 'bg-red-50 text-red-600',
    warning: 'bg-amber-50 text-amber-600',
    info: 'bg-blue-50 text-blue-600',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{cancelText}</Button>
          <Button variant={variant} onClick={onConfirm}>{confirmText}</Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg ${iconColors[variant] || iconColors.danger} shrink-0`}>
          <Icon className="text-xl" />
        </div>
        <p className="text-sm text-gray-600 pt-1">{message}</p>
      </div>
    </Modal>
  );
}
