interface NicknameInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function NicknameInput({ value, onChange, disabled }: NicknameInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value.slice(0, 32))}
      disabled={disabled}
      maxLength={32}
      placeholder="Enter your nickname"
      className="input"
      aria-label="Nickname"
      autoComplete="nickname"
    />
  );
}