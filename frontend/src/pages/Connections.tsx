import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Connections = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to Open Finance by default
    navigate("/app/connections/open-finance", { replace: true });
  }, [navigate]);

  return null;
};

export default Connections;
