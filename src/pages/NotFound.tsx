
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  const getLastKnownRoute = () => {
    try {
    
      const lsRoute = localStorage.getItem('lastRoute');
      if (lsRoute && lsRoute !== location.pathname) {
        return lsRoute;
      }
      
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
      };
      
      const cookieRoute = getCookie('lastRoute');
      if (cookieRoute && cookieRoute !== location.pathname) {
        return cookieRoute;
      }

      return "/home";
    } catch (e) {
      console.error("Error retrieving last route:", e);
      return "/home";
    }
  };

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
    
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      const lastRoute = getLastKnownRoute();
      navigate(lastRoute);
    }
  }, [location.pathname, countdown, navigate]);

  const handleManualRedirect = () => {
    const lastRoute = getLastKnownRoute();
    navigate(lastRoute);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center p-6 bg-black text-white rounded-lg shadow-md border border-primary">
        <h1 className="text-4xl font-bold mb-4 text-primary">RotaCerta</h1>
        <p className="text-xl mb-4">Tudo certo! aguarde um instante</p>
        <p className="text-gray-300 mb-6">
          Redirecionando automaticamente em <span className="font-bold">{countdown}</span> segundos...
        </p>
        <div className="space-y-3">
          <Button 
            onClick={handleManualRedirect}
            className="w-full"
          >
            Voltar para a última página
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate("/home")}
            className="w-full border-primary"
          >
            Ir para a página inicial
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
