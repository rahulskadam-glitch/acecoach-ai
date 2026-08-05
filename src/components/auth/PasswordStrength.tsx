type Props = { password: string };

function analyse(pw: string) {
  if (!pw) return null;
  if (pw.length < 8) {
    return { score: 0, label: "Too short", color: "text-slate-500", bar: "bg-slate-600", hint: "Use at least 8 characters" };
  }
  let points = 0;
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);

  if (hasLower && hasUpper) points++;
  if (hasNumber) points++;
  if (hasSymbol) points++;
  // Bonus point for long passwords (16+ chars)
  if (pw.length >= 16) points++;

  const missing = [];
  if (!hasUpper || !hasLower) missing.push("mixed case");
  if (!hasNumber) missing.push("numbers");
  if (!hasSymbol) missing.push("symbols");

  const hint = missing.length > 0 ? `Add ${missing.join(", ")}` : null;

  if (points <= 1) return { score: 1, label: "Weak", color: "text-rose-400", bar: "bg-rose-500", hint };
  if (points === 2) return { score: 2, label: "Fair", color: "text-amber-400", bar: "bg-amber-500", hint };
  if (points === 3) return { score: 3, label: "Good", color: "text-sky-400", bar: "bg-sky-500", hint };
  return { score: 4, label: "Strong", color: "text-emerald-400", bar: "bg-emerald-500", hint: null };
}

export default function PasswordStrength({ password }: Props) {
  const result = analyse(password);
  if (!result) return null;
  const { score, label, color, bar, hint } = result;

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${level <= score ? bar : "bg-white/10"}`}
          />
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Strength: <span className={`font-medium ${color}`}>{label}</span>
        {hint ? <span className="ml-1 opacity-60">· {hint}</span> : null}
      </p>
    </div>
  );
}

