import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function HomeBackButton() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="home-back-button"
      onClick={() => navigate("/dashboard")}
      aria-label="العودة إلى الرئيسية"
      title="العودة إلى الرئيسية"
    >
      <ArrowRight size={17} />
      <span>العودة إلى الرئيسية</span>
    </button>
  );
}
