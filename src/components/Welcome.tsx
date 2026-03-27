
import { Link } from "react-router-dom";
import BrandLogo from "./BrandLogo";

const Welcome = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-between p-6">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md">
        {}
        <BrandLogo alt="RotaCerta Logo" className="mb-8 h-24 w-24" />
        
        <h1 className="text-primary text-3xl font-bold mb-2 text-center">
          Bem-vindo ao RotaCerta
        </h1>
        
        <p className="text-foreground text-center mb-12">
          Controle suas finanças e manutenções de forma simples e eficiente
        </p>

        <div className="w-full space-y-4">
          <Link
            to="/password-advice"
            className="block w-full bg-primary text-primary-foreground font-semibold py-4 rounded-lg text-center"
          >
            Cadastrar
          </Link>
          
          <Link
            to="/login"
            className="block w-full bg-secondary text-secondary-foreground font-semibold py-4 rounded-lg text-center border border-primary"
          >
            Já sou cadastrado
          </Link>
        </div>
      </div>

      <p className="text-foreground text-sm text-center mt-8">
        Ao continuar, você concorda com nossas{" "}
        <a href="https://lgpd-rotacerta.netlify.app" target="_blank" rel="noopener noreferrer" className="text-primary">
          Políticas de privacidade
        </a>{" "}
        e{" "}
        <a href="https://lgpd-rotacerta.netlify.app" target="_blank" rel="noopener noreferrer" className="text-primary">
          Termos de uso
        </a>
      </p>
    </div>
  );
};

export default Welcome;
