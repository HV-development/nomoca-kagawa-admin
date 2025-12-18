interface ErrorMessageProps {
  message?: string;
  field?: string;
}

export default function ErrorMessage({ message, field: _field }: ErrorMessageProps) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-red-600">{message}</p>;
}



