import { FaTriangleExclamation, FaTrashCan, FaCircleInfo } from 'react-icons/fa6';
import Modal from './Modal.jsx';
import Button from './Button.jsx';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Amalni tasdiqlang',
  message = 'Haqiqatan ham bu amalni bajarishni xohlaysizmi?',
  confirmText = 'Tasdiqlash',
  cancelText = 'Bekor qilish',
  variant = 'danger',
  icon: Icon = null,
}) {
  const iconColors = {
    danger: 'bg-rose-50 text-rose-600 border-rose-200/80',
    warning: 'bg-amber-50 text-amber-600 border-amber-200/80',
    info: 'bg-blue-50 text-blue-600 border-blue-200/80',
  };

  const SelectedIcon = Icon || (variant === 'danger' ? FaTrashCan : variant === 'warning' ? FaTriangleExclamation : FaCircleInfo);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>
            {cancelText}
          </Button>
          <Button variant={variant} size="md" onClick={onConfirm}>
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div className={`p-3.5 rounded-2xl border ${iconColors[variant] || iconColors.danger} shrink-0`}>
          <SelectedIcon className="text-xl" />
        </div>
        <p className="text-sm text-slate-600 font-medium pt-1 leading-relaxed">
          {message}
        </p>
      </div>
    </Modal>
  );
}
