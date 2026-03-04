import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = {
  title: "Iniciar Sesión - InmoAI",
  description: "Inicia sesión en tu cuenta de InmoAI",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <LoginForm />
    </Suspense>
  );
}
