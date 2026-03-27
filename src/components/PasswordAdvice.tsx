
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import BrandLogo from "./BrandLogo";

const PasswordAdvice = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-between p-6">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md">
        <BrandLogo alt="RotaCerta Logo" className="mb-8 h-24 w-24" />
        
        <div className="bg-secondary rounded-lg p-6 border border-primary mb-8">
          <h1 className="text-primary text-2xl font-bold mb-6 text-center">
            Segurança da sua Conta
          </h1>
          
          <p className="text-foreground text-center mb-6 leading-relaxed">
            Por favor, anote e guarde sua senha com segurança, pois ela é essencial para o seu acesso futuro. Todos os seus dados serão criptografados e protegidos, e a senha é a chave para garantir a integridade e a segurança das suas informações pessoais.
          </p>

          <div className="w-full space-y-4 mt-8">
            <Link to="/" className="block w-full">
              <Button 
                variant="outline" 
                className="w-full justify-center border-primary"
              >
                <ArrowLeft className="mr-2" size={18} />
                Voltar
              </Button>
            </Link>
            
            <Link to="/register" className="block w-full">
              <Button 
                className="w-full justify-center bg-[#FFC107] text-black hover:bg-[#FFC107]/90"
              >
                Continuar com o Cadastro
                <ArrowRight className="ml-2" size={18} />
              </Button>
            </Link>
          </div>
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

export default PasswordAdvice;
