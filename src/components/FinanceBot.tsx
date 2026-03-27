import { useState } from "react";
import { Bot, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Message = {
  id: number;
  text: string;
  isBot: boolean;
};

type Question = {
  id: number;
  text: string;
  emoji: string;
  handler: (data: any) => string;
};

const FinanceBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showQuestions, setShowQuestions] = useState(true);

  
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', 'finance-bot'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

 
  const financialData = transactions.reduce(
    (acc, transaction) => {
      const amount = Number(transaction.amount);
      if (transaction.type === 'income') {
        acc.income += amount;
      } else {
        acc.expenses += amount;
        if (amount > acc.highestExpense) {
          acc.highestExpense = amount;
        }
      }
      acc.balance = acc.income - acc.expenses;
      return acc;
    },
    { income: 0, expenses: 0, balance: 0, highestExpense: 0 }
  );

  const questions: Question[] = [
    {
      id: 1,
      text: "Qual é o meu saldo atual?",
      emoji: "💰",
      handler: (data) => `Seu saldo atual é R$ ${data.balance.toFixed(2)}`,
    },
    {
      id: 2,
      text: "Qual foi minha maior despesa recente?",
      emoji: "⚠️",
      handler: (data) => `Sua maior despesa foi de R$ ${data.highestExpense.toFixed(2)}`,
    },
    {
      id: 3,
      text: "Qual é a minha receita atual?",
      emoji: "📊",
      handler: (data) => `Sua receita atual é R$ ${data.income.toFixed(2)}`,
    },
    {
      id: 4,
      text: "Qual é a minha despesa atual?",
      emoji: "📉",
      handler: (data) => `Sua despesa atual é R$ ${data.expenses.toFixed(2)}`,
    },
  ];

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open && messages.length === 0) {
      setMessages([
        {
          id: 1,
          text: "É muito bom te ver por aqui, chefe!",
          isBot: true,
        },
      ]);
      setShowQuestions(true);
    }
  };

  const handleQuestionClick = (question: Question) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), text: question.text, isBot: false },
      { id: Date.now() + 1, text: question.handler(financialData), isBot: true },
    ]);
    setShowQuestions(false);
  };

  const handleReset = () => {
    setMessages([]);
    setShowQuestions(true);
    handleOpen(true);
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full w-12 h-12"
        >
          <Bot className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex justify-between items-center">
            <span>RotaCerta Bot</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.isBot ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`rounded-lg px-4 py-2 max-w-[80%] ${
                    message.isBot
                      ? "bg-secondary text-primary"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
          </div>

          {showQuestions && (
            <div className="space-y-2">
              {questions.map((question) => (
                <Button
                  key={question.id}
                  variant="outline"
                  className="w-full justify-start text-left"
                  onClick={() => handleQuestionClick(question)}
                >
                  <span className="mr-2">{question.emoji}</span>
                  {question.text}
                </Button>
              ))}
            </div>
          )}

          {!showQuestions && (
            <Button
              className="w-full"
              variant="outline"
              onClick={handleReset}
            >
              Fazer nova pergunta
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FinanceBot;
