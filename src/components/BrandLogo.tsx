import { cn } from "@/lib/utils";

type BrandLogoProps = {
  alt?: string;
  className?: string;
};

const BrandLogo = ({ alt = "Rota Certa", className }: BrandLogoProps) => (
  <img
    src="/Rotacertaoficial.jpg"
    alt={alt}
    className={cn("rounded-[2rem] object-cover", className)}
  />
);

export default BrandLogo;
