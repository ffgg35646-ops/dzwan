import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface HomeBackButtonProps {
  label?: string;
}

export function HomeBackButton({
  label = "العودة إلى الرئيسية",
}: HomeBackButtonProps) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="btn"
      onClick={() => navigate("/dashboard")}
    >
      <ArrowRight size={17} />
      {label}
    </button>
  );
}
