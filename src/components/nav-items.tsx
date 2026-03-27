import {
  Car,
  LucideIcon,
  MessageSquare,
  Package,
  Store,
  Wallet,
} from "lucide-react";

export type NavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  onboardingTitle: string;
  onboardingDescription: string;
  onboardingTip: string;
};

export const navItems: NavItem[] = [
  {
    label: "Finanças",
    path: "/home",
    icon: Wallet,
    onboardingTitle: "Finanças sob controle",
    onboardingDescription:
      "Aqui você acompanha saldo do dia, receitas, despesas e atalhos para registrar tudo mais rápido.",
    onboardingTip:
      "Use o botão amarelo para lançamentos manuais e o botão da IA para ler comprovantes.",
  },
  {
    label: "Entregas",
    path: "/delivery-panel",
    icon: Package,
    onboardingTitle: "Radar de entregas",
    onboardingDescription:
      "Nesta aba você encontra corridas disponíveis, aceita pedidos e acompanha o que já está em rota.",
    onboardingTip:
      "Assim que finalizar uma entrega, o valor entra no saldo do dia automaticamente.",
  },
  {
    label: "Garagem",
    path: "/maintenance",
    icon: Car,
    onboardingTitle: "Garagem da moto",
    onboardingDescription:
      "Aqui ficam manutenções, abastecimentos, odômetro e o histórico para cuidar melhor da moto.",
    onboardingTip:
      "Sempre atualize KM, peça ou serviço para o app calcular melhor seus custos.",
  },
  {
    label: "Lojas",
    path: "/statistics",
    icon: Store,
    onboardingTitle: "Lojas parceiras",
    onboardingDescription:
      "Nesta área você busca ofertas, compara categorias e fala com a loja direto no WhatsApp.",
    onboardingTip:
      "Toque no nome da loja para abrir o perfil e use os filtros para achar peças mais rápido.",
  },
  {
    label: "Comunidade",
    path: "/community",
    icon: MessageSquare,
    onboardingTitle: "Comunidade da pista",
    onboardingDescription:
      "Aqui você compartilha dicas, comenta posts, envia alertas de rota e acompanha o ranking.",
    onboardingTip:
      "Use Feed para trocar ideia, Alertas para avisos rápidos e Ranking para ver quem mais ajuda.",
  },
];

export const navItemMap = Object.fromEntries(
  navItems.map((item) => [item.path, item]),
) as Record<string, NavItem>;
