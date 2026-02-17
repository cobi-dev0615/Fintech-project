import {
  ArrowDownLeft,
  Coffee,
  Home,
  ShoppingBag,
  Zap,
  DollarSign,
  CreditCard,
  Receipt,
  Building2,
  Car,
  Heart,
  Gamepad2,
  GraduationCap,
  Briefcase,
  type LucideIcon,
} from "lucide-react";

export const getCategoryIcon = (category: string | null | undefined): LucideIcon => {
  if (!category) return DollarSign;

  const c = category.toLowerCase();

  if (c.includes('alimentação') || c.includes('food') || c.includes('restaurant') || c.includes('café'))
    return Coffee;
  if (c.includes('compras') || c.includes('shopping') || c.includes('retail'))
    return ShoppingBag;
  if (c.includes('utilidades') || c.includes('utilities') || c.includes('luz') || c.includes('água') || c.includes('energia'))
    return Zap;
  if (c.includes('moradia') || c.includes('housing') || c.includes('aluguel') || c.includes('rent'))
    return Home;
  if (c.includes('transporte') || c.includes('transport') || c.includes('carro') || c.includes('gasolina'))
    return Car;
  if (c.includes('saúde') || c.includes('health') || c.includes('médico') || c.includes('farmacia'))
    return Heart;
  if (c.includes('educação') || c.includes('education') || c.includes('escola') || c.includes('curso'))
    return GraduationCap;
  if (c.includes('trabalho') || c.includes('work') || c.includes('escritório'))
    return Briefcase;
  if (c.includes('entretenimento') || c.includes('entertainment') || c.includes('jogo') || c.includes('game'))
    return Gamepad2;
  if (c.includes('renda') || c.includes('income') || c.includes('salário') || c.includes('depósito'))
    return ArrowDownLeft;
  if (c.includes('cartão') || c.includes('card') || c.includes('credit'))
    return CreditCard;
  if (c.includes('conta') || c.includes('bill') || c.includes('pagamento'))
    return Receipt;
  if (c.includes('banco') || c.includes('bank') || c.includes('instituição'))
    return Building2;

  return DollarSign;
};
